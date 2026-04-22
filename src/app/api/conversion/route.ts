import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { callLLM } from "@/lib/content-skills/llm";

export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "overview";

  if (action === "overview") {
    // 多表并行查询
    const [trustSignals, reviews, qualityIssues, experiments, supportSessions, loyaltyMembers] = await Promise.all([
      supabase.from("trust_signals").select("*"),
      supabase.from("review_requests").select("reviewed, has_photo, rating").limit(500),
      supabase.from("product_quality_issues").select("*").eq("resolved", false),
      supabase.from("cvr_experiments").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("support_sessions").select("response_time_seconds, led_to_purchase, order_value_usd").limit(500),
      supabase.from("loyalty_members").select("tier"),
    ]);

    // 计算关键指标
    const trustAll = trustSignals.data || [];
    const trustPresent = trustAll.filter(t => t.is_present).length;
    const trustCoveragePct = trustAll.length > 0 ? Math.round((trustPresent / trustAll.length) * 100) : 0;

    const reviewsAll = reviews.data || [];
    const reviewedCount = reviewsAll.filter(r => r.reviewed).length;
    const photoReviewCount = reviewsAll.filter(r => r.reviewed && r.has_photo).length;
    const avgRating = reviewedCount > 0
      ? reviewsAll.filter(r => r.reviewed && r.rating).reduce((s, r) => s + (r.rating || 0), 0) / reviewedCount
      : 0;
    const reviewRate = reviewsAll.length > 0 ? Math.round((reviewedCount / reviewsAll.length) * 100) : 0;
    const photoRate = reviewedCount > 0 ? Math.round((photoReviewCount / reviewedCount) * 100) : 0;

    const issues = qualityIssues.data || [];
    const criticalIssues = issues.filter(i => i.severity === "critical" || i.severity === "high").length;

    const support = supportSessions.data || [];
    const withResponseTime = support.filter(s => s.response_time_seconds != null);
    const avgResponseSec = withResponseTime.length > 0
      ? Math.round(withResponseTime.reduce((s, r) => s + (r.response_time_seconds || 0), 0) / withResponseTime.length)
      : 0;
    const conversionsFromChat = support.filter(s => s.led_to_purchase).length;
    const chatRevenue = support.reduce((s, r) => s + Number(r.order_value_usd || 0), 0);

    const loyalty = loyaltyMembers.data || [];
    const tierBreakdown: Record<string, number> = {};
    for (const m of loyalty) tierBreakdown[m.tier] = (tierBreakdown[m.tier] || 0) + 1;

    // 综合 CVR 健康分（参考研究 baseline）
    const baseline = 2.76;
    const cvrLift =
      (trustCoveragePct / 100) * 0.8 +   // 信任信号满分最高 +80%
      Math.min(reviewRate / 20, 1) * 0.3 + // 评价率 20%+ 加 30%
      Math.min(photoRate / 50, 1) * 0.2 + // 带图率 50%+ 加 20%
      Math.max(0, 1 - criticalIssues / 5) * 0.2; // 0 critical 加 20%
    const projectedCvr = baseline * (1 + cvrLift);

    return NextResponse.json({
      metrics: {
        trust_coverage_pct: trustCoveragePct,
        review_rate_pct: reviewRate,
        photo_review_rate_pct: photoRate,
        avg_rating: Number(avgRating.toFixed(2)),
        quality_issues_critical: criticalIssues,
        support_avg_response_sec: avgResponseSec,
        support_conversion_count: conversionsFromChat,
        support_attributed_revenue: chatRevenue,
        loyalty_tier_breakdown: tierBreakdown,
        projected_cvr_pct: Number(projectedCvr.toFixed(2)),
        industry_baseline_cvr_pct: baseline,
      },
      trust_signals: trustAll,
      quality_issues: issues,
      experiments: experiments.data || [],
    });
  }

  if (action === "trust_signals") {
    const { data } = await supabase.from("trust_signals").select("*").order("page_type");
    return NextResponse.json({ signals: data || [] });
  }

  if (action === "quality_issues") {
    const { data } = await supabase.from("product_quality_issues").select("*").order("severity", { ascending: false });
    return NextResponse.json({ issues: data || [] });
  }

  if (action === "experiments") {
    const { data } = await supabase.from("cvr_experiments").select("*").order("created_at", { ascending: false });
    return NextResponse.json({ experiments: data || [] });
  }

  return NextResponse.json({ error: "未知 action" }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "toggle_trust_signal") {
      const { id, is_present, quality_score } = body;
      const { data } = await supabase.from("trust_signals").update({
        is_present,
        quality_score,
        last_audited: new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      }).eq("id", id).select().single();
      return NextResponse.json({ signal: data });
    }

    if (action === "create_experiment") {
      const { hypothesis, experiment_area, change_description, predicted_cvr_lift_pct, effort } = body;
      const { data, error } = await supabase.from("cvr_experiments").insert({
        hypothesis, experiment_area, change_description, predicted_cvr_lift_pct, effort,
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ experiment: data });
    }

    if (action === "log_quality_issue") {
      const { data, error } = await supabase.from("product_quality_issues").insert(body.issue).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ issue: data });
    }

    // AI 生成本周 CVR 优化建议（基于真实指标）
    if (action === "ai_weekly_recommendations") {
      const overviewRes = await fetch(request.url.replace(/\?.*$/, "?action=overview"));
      const overview = await overviewRes.json();
      const metrics = overview.metrics;

      const rec = await callLLM(
        `你是 CVR 优化专家。基于真实指标告诉用户本周 3 个优化动作（按 ROI 优先级）。

**你的原则**：
1. 只推荐能在 2 周内看到数据变化的动作
2. 每个动作标明：预期 CVR 提升 + 实施时间 + 成本
3. 如果信任信号覆盖 < 60% → 最优先补信任信号
4. 如果评价率 < 10% → 启动评价获取序列
5. 如果 critical 品质问题 > 3 → 先解决品质
6. 如果客服响应 > 120s → 先配 AI 辅助
7. 不要说 "A/B test everything"，要具体

返回 JSON:
{
  "top_3_actions": [
    {
      "rank": 1,
      "action": "具体动作",
      "rationale": "为什么（引用具体数字）",
      "expected_cvr_lift": "+X% CVR",
      "implementation_days": 数字,
      "cost_usd": "$X / 免费",
      "skill_to_use": "推荐调用的 skill ID"
    }
  ],
  "one_line_insight": "本周洞察一句话"
}`,
        `指标:
${JSON.stringify(metrics, null, 2)}

请给出本周 3 个最优动作。`,
        2000
      );
      return NextResponse.json(rec);
    }

    return NextResponse.json({ error: "未知 action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "API 失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
