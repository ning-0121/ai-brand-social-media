import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { callLLM } from "@/lib/content-skills/llm";

export const maxDuration = 60;

type TrafficChannel = {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: string;
  monthly_budget_usd: number;
  monthly_spent_usd: number;
  month_to_date_traffic: number;
  month_to_date_conversions: number;
  month_to_date_revenue_usd: number;
  roas: number | null;
  cpa_usd: number | null;
  cpc_usd: number | null;
  scaling_ceiling_monthly_usd: number | null;
  ai_leverage_score: number | null;
  time_to_roi_days: number | null;
  notes: string | null;
  last_updated: string | null;
};

function computeChannelHealth(c: TrafficChannel): {
  roas_vs_target: "healthy" | "warning" | "danger" | "n/a";
  utilization_pct: number;
  next_dollar_score: number; // 0-100, higher = 更应该加钱
} {
  const target = 2.5; // 行业最低目标 ROAS
  const roas = c.roas || 0;
  const spent = Number(c.monthly_spent_usd || 0);
  const budget = Number(c.monthly_budget_usd || 0);
  const utilization = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  let health: "healthy" | "warning" | "danger" | "n/a" = "n/a";
  if (c.status === "active" && roas > 0) {
    if (roas >= target) health = "healthy";
    else if (roas >= 1.5) health = "warning";
    else health = "danger";
  }

  // next-dollar score：高 ROAS + 未触达天花板 + 高 AI 杠杆
  const ceiling = Number(c.scaling_ceiling_monthly_usd || 0);
  const revenue = Number(c.month_to_date_revenue_usd || 0);
  const headroom = ceiling > 0 ? Math.max(0, 1 - revenue / ceiling) : 0.5;
  const aiLev = Number(c.ai_leverage_score || 5) / 10;
  const roasScore = Math.min(1, roas / 5); // ROAS 5+ 满分
  const nextDollarScore = Math.round((roasScore * 0.5 + headroom * 0.3 + aiLev * 0.2) * 100);

  return { roas_vs_target: health, utilization_pct: utilization, next_dollar_score: nextDollarScore };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "overview";

  if (action === "overview") {
    const { data: channels } = await supabase
      .from("traffic_channels").select("*").order("category", { ascending: true });
    const enriched = (channels || []).map(c => ({ ...c, health: computeChannelHealth(c as TrafficChannel) }));

    // Aggregate totals
    const totals = (channels || []).reduce((acc, c) => {
      acc.spent += Number(c.monthly_spent_usd || 0);
      acc.revenue += Number(c.month_to_date_revenue_usd || 0);
      acc.traffic += Number(c.month_to_date_traffic || 0);
      acc.conversions += Number(c.month_to_date_conversions || 0);
      return acc;
    }, { spent: 0, revenue: 0, traffic: 0, conversions: 0 });
    const blendedRoas = totals.spent > 0 ? totals.revenue / totals.spent : 0;
    const avgCvr = totals.traffic > 0 ? (totals.conversions / totals.traffic) * 100 : 0;

    return NextResponse.json({
      channels: enriched,
      totals: { ...totals, blended_roas: blendedRoas, avg_cvr_pct: avgCvr },
    });
  }

  if (action === "keywords") {
    const { data } = await supabase.from("seo_keywords").select("*").order("current_rank", { ascending: true });
    return NextResponse.json({ keywords: data || [] });
  }

  if (action === "clusters") {
    const { data } = await supabase.from("content_clusters").select("*").order("created_at", { ascending: false });
    return NextResponse.json({ clusters: data || [] });
  }

  if (action === "haro_pitches") {
    const { data } = await supabase.from("haro_pitches").select("*").order("deadline", { ascending: true });
    return NextResponse.json({ pitches: data || [] });
  }

  return NextResponse.json({ error: "未知 action" }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "update_channel") {
      const { id, updates } = body;
      if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

      const computeFields: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };
      // 自动计算 ROAS / CPA / CPC
      const spent = Number(updates.monthly_spent_usd || 0);
      const revenue = Number(updates.month_to_date_revenue_usd || 0);
      const traffic = Number(updates.month_to_date_traffic || 0);
      const conversions = Number(updates.month_to_date_conversions || 0);
      if (spent > 0 && revenue > 0) computeFields.roas = Number((revenue / spent).toFixed(2));
      if (spent > 0 && conversions > 0) computeFields.cpa_usd = Number((spent / conversions).toFixed(2));
      if (spent > 0 && traffic > 0) computeFields.cpc_usd = Number((spent / traffic).toFixed(4));

      const { data } = await supabase.from("traffic_channels").update(computeFields).eq("id", id).select().single();
      return NextResponse.json({ channel: data });
    }

    if (action === "add_keyword") {
      const { keyword, intent, target_url, search_volume_monthly, priority } = body;
      const { data, error } = await supabase.from("seo_keywords").insert({
        keyword, intent: intent || "commercial", target_url,
        search_volume_monthly, priority: priority || "medium",
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ keyword: data });
    }

    if (action === "update_keyword_rank") {
      const { id, current_rank } = body;
      const { data: existing } = await supabase.from("seo_keywords").select("current_rank").eq("id", id).single();
      const updates: Record<string, unknown> = {
        current_rank,
        previous_rank: existing?.current_rank || null,
        last_checked: new Date().toISOString().split("T")[0],
      };
      const { data } = await supabase.from("seo_keywords").update(updates).eq("id", id).select().single();
      return NextResponse.json({ keyword: data });
    }

    if (action === "delete_keyword") {
      const { id } = body;
      await supabase.from("seo_keywords").delete().eq("id", id);
      return NextResponse.json({ success: true });
    }

    // 下一块$ 该投哪里？AI 基于真实数据推荐
    if (action === "next_dollar_recommendation") {
      const { data: channels } = await supabase.from("traffic_channels").select("*");
      const enriched = (channels || []).map(c => ({
        name: c.name,
        slug: c.slug,
        category: c.category,
        status: c.status,
        roas: c.roas,
        spent: c.monthly_spent_usd,
        revenue: c.month_to_date_revenue_usd,
        ceiling: c.scaling_ceiling_monthly_usd,
        ai_leverage: c.ai_leverage_score,
        time_to_roi: c.time_to_roi_days,
        health: computeChannelHealth(c as TrafficChannel),
      }));

      const rec = await callLLM(
        `你是 DTC 付费 + SEO + PR 全渠道投放专家。根据店铺真实的各渠道数据，建议用户下一笔钱（假设 $500）应该投哪里。

**决策原则（严格遵守）**：
1. 已盈利（ROAS >= 2.5）且未到天花板 → 继续加码（高优先级）
2. 亏损（ROAS < 1.5） → 先修不加预算
3. 未启动且 AI 杠杆高（>= 8）→ 推荐启动（低成本试错）
4. 长周期渠道（time_to_roi > 60 天）→ 不着急加钱，但要保持喂养
5. 如果所有付费渠道都达标了，推荐投自营/SEO（长期最划算）

返回 JSON:
{
  "recommendation": {
    "channel_slug": "推荐的渠道 slug",
    "amount_usd": 500,
    "priority": "critical | high | medium",
    "rationale": "为什么（含具体数字）",
    "expected_return": "预期回报"
  },
  "alternatives": [
    {"channel_slug": "次选", "amount_usd": 数字, "when_to_consider": "什么情况下选这个"}
  ],
  "kill_recommendations": [
    {"channel_slug": "建议停掉或缩减的", "reason": "原因"}
  ],
  "holistic_insight": "全局洞察一句话"
}`,
        `各渠道数据：
${JSON.stringify(enriched, null, 2)}

请给出下 $500 的分配建议。`,
        2500
      );

      return NextResponse.json(rec);
    }

    return NextResponse.json({ error: "未知 action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "API 失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
