import { supabase } from "./supabase";
import { callLLM } from "./content-skills/llm";

export interface RadarSignal {
  type: "competitor" | "trend" | "viral";
  title: string;
  source: string;
  signal: Record<string, unknown>;
  relevant_product_ids: string[];
  suggested_skill_id: string;
  priority: "high" | "medium" | "low";
}

export async function runRadarScan(): Promise<{ signals_created: number }> {
  const signals: RadarSignal[] = [];

  // 1. 竞品扫描 - 从 competitors 表读取已有数据
  const { data: competitors } = await supabase
    .from("competitors")
    .select("*")
    .order("growth_rate", { ascending: false })
    .limit(5);

  for (const c of competitors || []) {
    if (c.growth_rate && c.growth_rate > 20) {
      signals.push({
        type: "competitor",
        title: `${c.name} 增长 ${c.growth_rate}%`,
        source: c.platform || "unknown",
        signal: {
          competitor_name: c.name,
          growth_rate: c.growth_rate,
          monthly_sales: c.monthly_sales,
          insight: `竞品 ${c.name} 月销 ${c.monthly_sales}，增长 ${c.growth_rate}%。建议分析其策略并差异化应对。`,
        },
        relevant_product_ids: [],
        suggested_skill_id: "social_post_pack",
        priority: c.growth_rate > 50 ? "high" : "medium",
      });
    }
  }

  // 2. 趋势扫描 - 从 hot_products 表读取
  const { data: hotProducts } = await supabase
    .from("hot_products")
    .select("*")
    .eq("trend", "up")
    .order("growth_rate", { ascending: false })
    .limit(5);

  // 加载本店商品用于关联匹配
  const { data: ourProducts } = await supabase
    .from("products")
    .select("id, name, category");

  for (const hp of hotProducts || []) {
    // 简单的品类匹配
    const relevantIds = (ourProducts || [])
      .filter((p) => p.category === hp.category)
      .map((p) => p.id);

    signals.push({
      type: "trend",
      title: `热门趋势: ${hp.name}`,
      source: hp.platform || "市场",
      signal: {
        product_name: hp.name,
        category: hp.category,
        growth_rate: hp.growth_rate,
        sales_volume: hp.sales_volume,
        insight: `${hp.category} 品类正在爆发，本店有 ${relevantIds.length} 个相关商品可借势。`,
      },
      relevant_product_ids: relevantIds,
      suggested_skill_id: relevantIds.length > 0 ? "social_post_pack" : "content_calendar",
      priority: hp.growth_rate > 30 ? "high" : "medium",
    });
  }

  // 3. 时事扫描 - 用 AI 生成
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const aiResult = await callLLM(
      "你是社媒趋势观察专家，了解全球节日、季节、热点。",
      `今天是 ${month}月${day}日。请列出未来 30 天内适合电商品牌借势的 5 个营销机会（节日、季节话题、热点）。

返回 JSON：
{
  "opportunities": [
    {
      "date": "MM-DD",
      "event": "事件名",
      "type": "节日/季节/热点",
      "marketing_angle": "营销切入角度",
      "suggested_skill": "推荐 skill id"
    }
  ]
}`,
      2000
    );

    const opportunities = (aiResult.opportunities || []) as Array<{
      date: string;
      event: string;
      type: string;
      marketing_angle: string;
      suggested_skill: string;
    }>;

    for (const opp of opportunities.slice(0, 5)) {
      signals.push({
        type: "viral",
        title: `${opp.event} (${opp.date})`,
        source: opp.type,
        signal: {
          event: opp.event,
          date: opp.date,
          marketing_angle: opp.marketing_angle,
          insight: opp.marketing_angle,
        },
        relevant_product_ids: [],
        suggested_skill_id: opp.suggested_skill || "content_calendar",
        priority: "medium",
      });
    }
  } catch (err) {
    console.error("AI 时事扫描失败:", err);
  }

  // 写入数据库
  if (signals.length > 0) {
    // 先标记旧信号为过期
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("radar_signals")
      .update({ status: "expired" })
      .lt("created_at", sevenDaysAgo)
      .eq("status", "open");

    // 插入新信号
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("radar_signals").insert(
      signals.map((s) => ({
        ...s,
        expires_at: expiresAt,
        status: "open",
      }))
    );
  }

  return { signals_created: signals.length };
}

export async function getRadarSignals(limit: number = 10) {
  const { data } = await supabase
    .from("radar_signals")
    .select("*")
    .eq("status", "open")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}
