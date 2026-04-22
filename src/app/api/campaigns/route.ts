import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { callLLM } from "@/lib/content-skills/llm";

export const maxDuration = 60;

// ── GET: overview + sub-resource queries ──────────────────────────────────────
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "campaigns";

  try {
    if (action === "campaigns") {
      const status = url.searchParams.get("status");
      let query = supabase.from("campaigns").select("*").order("start_date", { ascending: false });
      if (status && status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ campaigns: data || [] });
    }

    if (action === "overview") {
      const [campaigns, kols, affiliates, collabs, marketplaces, tests] = await Promise.all([
        supabase.from("campaigns").select("id,name,status,budget,start_date,end_date,campaign_type"),
        supabase.from("kol_partnerships").select("status,attributed_revenue,expected_reach,actual_reach").limit(200),
        supabase.from("affiliate_members").select("tier,status,total_sales_usd,total_commissions_usd"),
        supabase.from("brand_collaborations").select("status,collab_type,actual_attributed_revenue"),
        supabase.from("marketplace_evaluations").select("platform,readiness_score,recommendation,status"),
        supabase.from("incrementality_tests").select("channel,reported_roas,actual_iroas,lift_pct,status").limit(20),
      ]);

      const activeCampaigns = (campaigns.data || []).filter(c => c.status === "active").length;
      const totalBudget = (campaigns.data || []).reduce((s, c) => s + (c.budget || 0), 0);

      const kolsAll = kols.data || [];
      const activeKols = kolsAll.filter(k => k.status === "active" || k.status === "contracted").length;
      const kolRevenue = kolsAll.reduce((s, k) => s + Number(k.attributed_revenue || 0), 0);
      const kolTotalReach = kolsAll.reduce((s, k) => s + (k.actual_reach || k.expected_reach || 0), 0);

      const affsAll = affiliates.data || [];
      const activeAffs = affsAll.filter(a => a.status === "active").length;
      const affRevenue = affsAll.reduce((s, a) => s + Number(a.total_sales_usd || 0), 0);
      const affCommissions = affsAll.reduce((s, a) => s + Number(a.total_commissions_usd || 0), 0);

      const collabsAll = collabs.data || [];
      const activeCollabs = collabsAll.filter(c => c.status === "active" || c.status === "contracted").length;
      const collabRevenue = collabsAll.reduce((s, c) => s + Number(c.actual_attributed_revenue || 0), 0);

      const latestTests = (tests.data || []).filter(t => t.status === "completed");
      const avgLift = latestTests.length > 0
        ? latestTests.reduce((s, t) => s + (t.lift_pct || 0), 0) / latestTests.length
        : null;

      return NextResponse.json({
        metrics: {
          campaigns: { total: (campaigns.data || []).length, active: activeCampaigns, total_budget: totalBudget },
          kols: { active: activeKols, attributed_revenue: kolRevenue, total_reach: kolTotalReach },
          affiliates: { active: activeAffs, attributed_revenue: affRevenue, commissions_paid: affCommissions },
          collabs: { active: activeCollabs, attributed_revenue: collabRevenue },
          incrementality: { tests_completed: latestTests.length, avg_lift_pct: avgLift },
        },
        marketplace_evaluations: marketplaces.data || [],
        recent_tests: tests.data || [],
      });
    }

    if (action === "kols") {
      const { data } = await supabase.from("kol_partnerships").select("*").order("created_at", { ascending: false });
      return NextResponse.json({ kols: data || [] });
    }

    if (action === "affiliates") {
      const { data } = await supabase.from("affiliate_members").select("*").order("total_sales_usd", { ascending: false });
      return NextResponse.json({ affiliates: data || [] });
    }

    if (action === "collabs") {
      const { data } = await supabase.from("brand_collaborations").select("*").order("created_at", { ascending: false });
      return NextResponse.json({ collabs: data || [] });
    }

    if (action === "annual_plan") {
      const year = parseInt(url.searchParams.get("year") || "2026");
      const { data } = await supabase.from("annual_campaign_plans").select("*").eq("year", year).maybeSingle();
      return NextResponse.json({ plan: data });
    }

    return NextResponse.json({ error: "未知 action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "查询失败" }, { status: 500 });
  }
}

// ── POST: mutations + AI actions ──────────────────────────────────────────────
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action, id, ...data } = body;

    // ── Campaign CRUD ──────────────────────────────────────────────────────────
    if (action === "create") {
      const { data: created, error } = await supabase.from("campaigns").insert(data).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, campaign: created });
    }

    if (action === "update") {
      await supabase.from("campaigns").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      await supabase.from("campaigns").delete().eq("id", id);
      return NextResponse.json({ success: true });
    }

    // ── KOL CRUD ──────────────────────────────────────────────────────────────
    if (action === "create_kol") {
      const { data: created, error } = await supabase.from("kol_partnerships").insert(data.kol).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, kol: created });
    }

    if (action === "update_kol") {
      const { data: updated } = await supabase
        .from("kol_partnerships")
        .update({ ...data.kol, updated_at: new Date().toISOString() })
        .eq("id", id).select().single();
      return NextResponse.json({ success: true, kol: updated });
    }

    // ── Affiliate CRUD ────────────────────────────────────────────────────────
    if (action === "create_affiliate") {
      const { data: created, error } = await supabase.from("affiliate_members").insert(data.affiliate).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, affiliate: created });
    }

    if (action === "update_affiliate_tier") {
      const { monthly_sales } = data;
      let tier = "brand_friend";
      if (monthly_sales >= 15000) tier = "vip_ambassador";
      else if (monthly_sales >= 5000) tier = "brand_elite";
      else if (monthly_sales >= 1000) tier = "brand_advocate";

      const commissionMap: Record<string, number> = {
        brand_friend: 12, brand_advocate: 15, brand_elite: 18, vip_ambassador: 20,
      };

      await supabase.from("affiliate_members").update({
        tier,
        commission_pct: commissionMap[tier],
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      return NextResponse.json({ success: true, new_tier: tier });
    }

    // ── Brand Collab CRUD ─────────────────────────────────────────────────────
    if (action === "create_collab") {
      const { data: created, error } = await supabase.from("brand_collaborations").insert(data.collab).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, collab: created });
    }

    if (action === "update_collab_status") {
      await supabase.from("brand_collaborations").update({
        status: data.status,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      return NextResponse.json({ success: true });
    }

    // ── Marketplace Evaluation ────────────────────────────────────────────────
    if (action === "update_marketplace_status") {
      await supabase.from("marketplace_evaluations").update({
        status: data.status,
        notes: data.notes,
        updated_at: new Date().toISOString(),
        ...(data.status === "launched" ? { launched_at: new Date().toISOString() } : {}),
      }).eq("id", id);
      return NextResponse.json({ success: true });
    }

    // ── Incrementality Test ───────────────────────────────────────────────────
    if (action === "create_incrementality_test") {
      const { data: created, error } = await supabase
        .from("incrementality_tests")
        .insert(data.test)
        .select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, test: created });
    }

    if (action === "record_test_results") {
      const { reported_roas, actual_iroas, lift_pct, revenue_in_test, revenue_in_control,
              incremental_revenue, spend_during_test, statistically_significant, p_value, action_taken } = data;
      await supabase.from("incrementality_tests").update({
        reported_roas, actual_iroas, lift_pct, revenue_in_test, revenue_in_control,
        incremental_revenue, spend_during_test, statistically_significant, p_value,
        action_taken, status: "completed", updated_at: new Date().toISOString(),
      }).eq("id", id);
      return NextResponse.json({ success: true });
    }

    // ── AI: Weekly Campaign Recommendations ──────────────────────────────────
    if (action === "ai_weekly_recommendations") {
      const overviewRes = await GET(new Request(
        `${new URL(request.url).origin}/api/campaigns?action=overview`,
        { headers: request.headers }
      ));
      const overview = await overviewRes.json();
      const metrics = overview.metrics;

      const rec = await callLLM(
        `你是 DTC 品牌活动运营总监。基于以下指标，给出本周 3 个优先行动。

**原则：**
1. 只推荐 2 周内能看到效果的动作
2. 每个动作：预期影响 + 实施时间 + 人力成本
3. KOL 没有 → 优先启动 nano-creator gifting
4. 联盟人数 < 5 → 优先招募联盟
5. 渠道扩张评分 > 70 且标为 evaluating → 提醒可以启动
6. 有增量测试结果 → 先解读再推下一步

返回 JSON:
{
  "top_3_actions": [
    {
      "rank": 1,
      "area": "KOL | Affiliate | Collab | Marketplace | Incrementality | Campaign",
      "action": "具体动作",
      "rationale": "引用具体数字的理由",
      "expected_impact": "预期效果",
      "implementation_days": 7,
      "effort": "low | medium | high",
      "human_decision_required": true,
      "decision_note": "需要人工确认的内容"
    }
  ],
  "one_line_insight": "本周运营洞察一句话"
}`,
        `指标：\n${JSON.stringify(metrics, null, 2)}`,
        2000
      );
      return NextResponse.json(rec);
    }

    // ── AI: Save Annual Plan ──────────────────────────────────────────────────
    if (action === "save_annual_plan") {
      const { year, ai_calendar, brand_category } = data;
      const { data: saved, error } = await supabase.from("annual_campaign_plans").upsert({
        year,
        brand_category,
        ai_calendar,
        budget_split: ai_calendar?.annual_budget_split,
        status: "draft",
        updated_at: new Date().toISOString(),
      }, { onConflict: "year" }).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, plan: saved });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "操作失败" }, { status: 500 });
  }
}
