import { NextResponse } from "next/server";
import { executeSkill } from "@/lib/content-skills/executor";

export const maxDuration = 60;
import { createApprovalTask } from "@/lib/supabase-approval";
import { createContent } from "@/lib/supabase-mutations";
import { getPendingTasks, getCompletedTasks } from "@/lib/content-task-dispatcher";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "tasks") {
      const pending = await getPendingTasks();
      const completed = await getCompletedTasks(10);
      return NextResponse.json({ pending, completed });
    }

    if (type === "products") {
      const { data } = await supabase
        .from("products")
        .select("id, name, body_html, meta_title, meta_description, tags, price, category, image_url, shopify_product_id")
        .order("created_at", { ascending: false })
        .limit(50);
      return NextResponse.json({ products: data || [] });
    }

    return NextResponse.json({ error: "未知查询类型" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Content plan GET error:", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "execute_skill": {
        const { skill_id, inputs, source_module, product_id, product_name } = body;
        if (!skill_id) return NextResponse.json({ error: "缺少 skill_id" }, { status: 400 });

        const result = await executeSkill(skill_id, inputs || {}, {
          sourceModule: source_module || "manual",
          productId: product_id,
          productName: product_name,
        });

        return NextResponse.json({ success: true, ...result });
      }

      case "submit_approval": {
        // 提交审批：把生成的结果送入审批系统
        const { task_id, title, description, payload } = body;

        const approval = await createApprovalTask({
          type: "content_publish",
          entity_type: "content_task",
          title: title || "[内容] 待审批",
          description: description || "",
          payload: { ...payload, content_task_id: task_id },
        });

        // 更新 content_task 关联审批
        if (task_id) {
          await supabase
            .from("content_tasks")
            .update({ status: "approved", approval_task_id: approval.id })
            .eq("id", task_id);
        }

        return NextResponse.json({ success: true, approval });
      }

      case "save_content": {
        // 保存为内容库条目
        const { title, body: contentBody, platform, content_type, tags, image_url } = body;
        const content = await createContent({
          title,
          body: contentBody,
          platform: platform || "shopify",
          content_type: content_type || "image_post",
          tags: tags || [],
          thumbnail_url: image_url,
          status: "draft",
        });
        return NextResponse.json({ success: true, content });
      }

      default:
        return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("Content plan POST error:", error);
    const msg = error instanceof Error ? error.message : "操作失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
