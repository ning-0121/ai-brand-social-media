import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  inferFromProductImage,
  inferFromVoiceOrText,
  inferFromShopifyData,
  inferFromCompetitorReference,
  saveInferences,
  confirmInference,
  calculateProfileCompletion,
} from "@/lib/client-profile/inference-engine";

export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "overview";

  if (action === "overview") {
    const completion = await calculateProfileCompletion();
    const { data: tasks } = await supabase
      .from("onboarding_tasks")
      .select("*")
      .order("display_order", { ascending: true });
    const { data: pendingInferences } = await supabase
      .from("client_inferences")
      .select("*")
      .eq("confirmed", false)
      .eq("rejected", false)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      completion,
      tasks: tasks || [],
      pending_inferences: pendingInferences || [],
    });
  }

  if (action === "tasks") {
    const { data } = await supabase
      .from("onboarding_tasks")
      .select("*")
      .order("display_order", { ascending: true });
    return NextResponse.json({ tasks: data || [] });
  }

  if (action === "inferences") {
    const onlyPending = url.searchParams.get("pending") === "true";
    let q = supabase.from("client_inferences").select("*").order("created_at", { ascending: false });
    if (onlyPending) q = q.eq("confirmed", false).eq("rejected", false);
    const { data } = await q;
    return NextResponse.json({ inferences: data || [] });
  }

  return NextResponse.json({ error: "未知 action" }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 提交任务输入 → 触发 AI 推理 → 保存任务 + 推理
    if (action === "submit_task") {
      const { task_key, input_data } = body;
      if (!task_key) return NextResponse.json({ error: "缺少 task_key" }, { status: 400 });

      const { data: task } = await supabase
        .from("onboarding_tasks")
        .select("*")
        .eq("task_key", task_key)
        .single();
      if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

      // 根据任务类型触发对应推理
      let inferences: Awaited<ReturnType<typeof inferFromProductImage>> = [];
      let inferenceSource: "voice_note" | "image_upload" | "text_input" | "shopify_sync" | "competitor_url" = "text_input";
      let sourceRef: string | undefined;

      switch (task.task_type) {
        case "image_upload": {
          const imageUrl = input_data?.image_url as string;
          if (imageUrl) {
            inferences = await inferFromProductImage(imageUrl, input_data?.context as string);
            inferenceSource = "image_upload";
            sourceRef = imageUrl;
          }
          break;
        }
        case "voice_note":
        case "text_input": {
          const text = (input_data?.transcript || input_data?.text) as string;
          if (text && text.length > 10) {
            // 如果是列竞品，用特定推理
            if (task_key === "list_2_competitors") {
              const brands = text.split(/[,，、\n]/).map(s => s.trim()).filter(Boolean);
              inferences = await inferFromCompetitorReference(brands);
              inferenceSource = "competitor_url";
            } else {
              inferences = await inferFromVoiceOrText(text);
              inferenceSource = task.task_type === "voice_note" ? "voice_note" : "text_input";
            }
            sourceRef = text.slice(0, 100);
          }
          break;
        }
        case "single_select":
        case "multi_select": {
          // 直接把选择存为推理（高置信度）
          const selected = input_data?.value as string;
          if (selected && task_key === "pick_operating_stance") {
            inferences = [{
              dimension: "growth_stance",
              inferred_value: { stance: selected },
              confidence: 1.0,
              reasoning: "用户直接选择",
            }];
            inferenceSource = "text_input";
          }
          break;
        }
      }

      // 保存推理
      const inferenceIds = await saveInferences(inferences, inferenceSource, sourceRef);

      // 标记任务完成
      await supabase.from("onboarding_tasks").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        input_data,
        inference_ids: inferenceIds,
      }).eq("task_key", task_key);

      const completion = await calculateProfileCompletion();
      return NextResponse.json({
        success: true,
        inferences_generated: inferences.length,
        inferences,
        completion,
      });
    }

    // 确认一个推理
    if (action === "confirm_inference") {
      const { inference_id, user_override } = body;
      if (!inference_id) return NextResponse.json({ error: "缺少 inference_id" }, { status: 400 });
      await confirmInference(inference_id, user_override);
      const completion = await calculateProfileCompletion();
      return NextResponse.json({ success: true, completion });
    }

    // 拒绝一个推理
    if (action === "reject_inference") {
      const { inference_id } = body;
      await supabase.from("client_inferences").update({ rejected: true }).eq("id", inference_id);
      return NextResponse.json({ success: true });
    }

    // 跳过任务
    if (action === "skip_task") {
      const { task_key } = body;
      await supabase.from("onboarding_tasks").update({
        status: "skipped",
        completed_at: new Date().toISOString(),
      }).eq("task_key", task_key);
      return NextResponse.json({ success: true });
    }

    // 从 Shopify 数据触发推理
    if (action === "run_shopify_inference") {
      // 拉真实 Shopify 数据
      const { data: products } = await supabase.from("products").select("price, body_html, tags").limit(50);
      const prices = (products || []).map(p => Number(p.price || 0)).filter(p => p > 0);
      const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      const min = prices.length ? Math.min(...prices) : 0;
      const max = prices.length ? Math.max(...prices) : 0;

      const descriptions = (products || [])
        .map(p => (p.body_html || "").toLowerCase())
        .join(" ");
      const highlights = ["sustainable", "luxury", "premium", "value", "trending", "new", "must-have", "ethical", "handmade", "limited"];
      const topWords = highlights.filter(w => descriptions.includes(w));

      const inferences = await inferFromShopifyData({
        product_count: products?.length || 0,
        avg_price: avg,
        price_range: [min, max],
        top_words_in_descriptions: topWords,
      });

      const inferenceIds = await saveInferences(inferences, "shopify_sync");
      return NextResponse.json({ inferences, inference_ids: inferenceIds });
    }

    return NextResponse.json({ error: "未知 action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "client-profile API 失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
