import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    let query = supabase.from("ad_campaigns").select("*").order("updated_at", { ascending: false });
    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    // KPIs
    const all = data || [];
    const active = all.filter((c) => c.status === "active");
    const totalSpend = all.reduce((s, c) => s + Number(c.spend || 0), 0);
    const totalRevenue = all.reduce((s, c) => s + Number(c.revenue || 0), 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    return NextResponse.json({
      campaigns: all,
      kpis: {
        total: all.length,
        active: active.length,
        total_spend: totalSpend,
        total_revenue: totalRevenue,
        avg_roas: Math.round(avgRoas * 100) / 100,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "查询失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, ...data } = body;

    if (action === "create") {
      const { data: created, error } = await supabase.from("ad_campaigns").insert(data).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, campaign: created });
    }

    if (action === "update") {
      await supabase.from("ad_campaigns").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      await supabase.from("ad_campaigns").delete().eq("id", id);
      return NextResponse.json({ success: true });
    }

    if (action === "ai_analyze") {
      // AI analyzes campaign and gives optimization recommendations
      const { data: campaign } = await supabase.from("ad_campaigns").select("*").eq("id", id).single();
      if (!campaign) return NextResponse.json({ error: "未找到广告计划" }, { status: 404 });

      const { result } = await executeSkill("ad_budget_planner", {
        monthly_budget: String(campaign.budget * 30),
        platforms: campaign.platform,
        goal: campaign.campaign_type === "conversion" ? "roas" : campaign.campaign_type,
      }, { sourceModule: "ads" });

      // Update campaign with AI recommendations
      await supabase.from("ad_campaigns").update({
        ai_recommendations: result.output,
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      return NextResponse.json({ success: true, recommendations: result.output });
    }

    if (action === "ai_creative") {
      // AI generates ad creatives for a campaign
      const { data: campaign } = await supabase.from("ad_campaigns").select("*").eq("id", id).single();
      if (!campaign) return NextResponse.json({ error: "未找到广告计划" }, { status: 404 });

      // Get a product to feature
      const { data: products } = await supabase.from("products").select("*")
        .eq("platform", "shopify").not("shopify_product_id", "is", null).limit(1);
      const product = products?.[0];

      const { result } = await executeSkill("ad_copy", {
        product: product || { name: "JOJOFEIFEI Collection", price: 49, category: "activewear" },
        ad_platform: campaign.platform,
        campaign_goal: campaign.campaign_type,
      }, { sourceModule: "ads" });

      // Save creatives to ad_creatives table
      const variations = (result.output as { ad_variations?: Array<Record<string, unknown>> }).ad_variations || [];
      for (const v of variations.slice(0, 3)) {
        await supabase.from("ad_creatives").insert({
          campaign_id: id,
          creative_type: "text",
          headline: v.headline as string,
          body: v.primary_text as string || v.description as string,
          cta: v.cta as string,
          platform_format: campaign.platform,
          status: "draft",
        });
      }

      return NextResponse.json({ success: true, creatives_count: variations.length, output: result.output });
    }

    if (action === "roi_check") {
      // Check ROI and flag underperforming campaigns
      const { data: activeCampaigns } = await supabase.from("ad_campaigns")
        .select("*").eq("status", "active");

      const alerts: Array<{ campaign: string; issue: string; action: string }> = [];
      for (const c of activeCampaigns || []) {
        const roas = c.spend > 0 ? c.revenue / c.spend : 0;
        if (c.spend > 50 && roas < 1) {
          alerts.push({
            campaign: c.name,
            issue: `ROAS ${roas.toFixed(2)}x (低于 1x 盈亏线)`,
            action: "建议暂停并优化创意/受众",
          });
        }
        if (c.spend > 100 && c.conversions === 0) {
          alerts.push({
            campaign: c.name,
            issue: `花费 $${c.spend} 但 0 转化`,
            action: "建议立即暂停，检查着陆页和受众",
          });
        }
      }

      return NextResponse.json({ success: true, alerts, total_active: (activeCampaigns || []).length });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "操作失败" }, { status: 500 });
  }
}
