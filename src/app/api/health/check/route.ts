import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export const maxDuration = 30;

type Status = "ok" | "warn" | "fail" | "skip";

interface Check {
  key: string;
  category: "env" | "db_schema" | "db_data" | "integration" | "activity";
  label: string;
  status: Status;
  detail: string;
  fix_hint?: string;
  impact?: string;
}

/**
 * 自检清单：把每个"功能实际能跑"的前置条件都 probe 一遍
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const checks: Check[] = [];
  const push = (c: Check) => checks.push(c);

  // ========== ENV 变量 ==========
  const env = (k: string) => !!process.env[k];

  push({
    key: "env.anthropic",
    category: "env",
    label: "Anthropic API Key",
    status: env("ANTHROPIC_API_KEY") ? "ok" : "fail",
    detail: env("ANTHROPIC_API_KEY") ? "已配置" : "未配置 — 所有 AI 内容生成会立刻失败",
    fix_hint: "Vercel Settings → Environment Variables 添加 ANTHROPIC_API_KEY",
    impact: "阻塞：SEO/详情页/所有文案类 skill",
  });

  push({
    key: "env.gemini",
    category: "env",
    label: "Gemini API Key（图片生成）",
    status: env("GEMINI_API_KEY") ? "ok" : "fail",
    detail: env("GEMINI_API_KEY") ? "已配置" : "未配置 — 无法生成任何图片",
    fix_hint: "Vercel 添加 GEMINI_API_KEY",
    impact: "阻塞：banner_design / ai_product_photo / 所有图片类 skill",
  });

  push({
    key: "env.openrouter",
    category: "env",
    label: "OpenRouter（可选）",
    status: env("OPENROUTER_API_KEY") ? "ok" : "warn",
    detail: env("OPENROUTER_API_KEY")
      ? "已启用 — 多模型 fallback 激活"
      : "未启用 — 走 Anthropic direct。Anthropic 过载时会失败而不是切备用",
    fix_hint: "openrouter.ai 注册 → Vercel 加 OPENROUTER_API_KEY",
    impact: "可选：降成本 + 失败自动切模型",
  });

  push({
    key: "env.inngest",
    category: "env",
    label: "Inngest DAG（可选）",
    status: env("INNGEST_EVENT_KEY") && env("INNGEST_SIGNING_KEY") ? "ok" : "warn",
    detail: env("INNGEST_EVENT_KEY") && env("INNGEST_SIGNING_KEY")
      ? "已启用 — 重型任务走 DAG 突破 60s"
      : "未启用 — new_product_content/homepage_update 走串行，可能 60s 超时",
    fix_hint: "app.inngest.com 注册 → 配 INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY",
    impact: "重型 pipeline 可能超时失败",
  });

  push({
    key: "env.shopify_webhook",
    category: "env",
    label: "Shopify Webhook Secret",
    status: env("SHOPIFY_WEBHOOK_SECRET") ? "ok" : "fail",
    detail: env("SHOPIFY_WEBHOOK_SECRET")
      ? "已配置 — 订单可回传 A/B 转化"
      : "未配置 — webhook 端点会拒绝所有订单，A/B 转化无法回传",
    fix_hint: "Shopify Admin 添加 Orders Create webhook，secret 填到 Vercel SHOPIFY_WEBHOOK_SECRET",
    impact: "阻塞：A/B 真实转化数据回流 → prompt 晋升闭环废掉",
  });

  push({
    key: "env.app_url",
    category: "env",
    label: "NEXT_PUBLIC_APP_URL",
    status: env("NEXT_PUBLIC_APP_URL") ? "ok" : "warn",
    detail: env("NEXT_PUBLIC_APP_URL") ? "已配置" : "未配置 — OAuth 回调/snippet 会用兜底硬编码地址",
    fix_hint: "Vercel 加 NEXT_PUBLIC_APP_URL = 你的 Vercel 域名",
    impact: "OAuth 可能跳错地址",
  });

  push({
    key: "env.cron_secret",
    category: "env",
    label: "CRON_SECRET",
    status: env("CRON_SECRET") ? "ok" : "fail",
    detail: env("CRON_SECRET") ? "已配置" : "未配置 — Vercel Cron 触发 hourly/daily 会被鉴权拒绝",
    fix_hint: "Vercel 加 CRON_SECRET（任意随机字符串）",
    impact: "阻塞：所有自动化 cron（hourly/daily）",
  });

  // ========== DB schema（探测表是否存在）==========
  const probeTable = async (table: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from(table).select("id", { head: true, count: "exact" }).limit(0);
      return !error;
    } catch { return false; }
  };

  const tables = [
    { name: "brand_guides", migration: "add_brand_guide.sql", impact: "品牌指南注入失效，所有 AI 输出无品牌一致性" },
    { name: "prompts", migration: "add_prompts_tables.sql", impact: "所有 DB prompt 失效，skill 走硬编码旧逻辑" },
    { name: "prompt_runs", migration: "add_prompts_tables.sql", impact: "无法追踪延迟/成本/分数" },
    { name: "prompt_outcomes", migration: "add_prompt_outcomes.sql", impact: "SEO 7 天效果测量失效" },
    { name: "campaign_variants", migration: "add_visual_dna.sql", impact: "A/B 活动无法存储" },
    { name: "campaign_calendar", migration: "add_visual_dna.sql", impact: "营销日历失效" },
  ];

  for (const t of tables) {
    const exists = await probeTable(t.name);
    push({
      key: `db.${t.name}`,
      category: "db_schema",
      label: `表 ${t.name}`,
      status: exists ? "ok" : "fail",
      detail: exists ? "已创建" : `表不存在 — migration 未跑`,
      fix_hint: exists ? undefined : `Supabase SQL Editor 跑 migrations/${t.migration}`,
      impact: exists ? undefined : t.impact,
    });
  }

  // probe RPC
  try {
    const { error } = await supabase.rpc("increment_ab_counter", { p_variant_id: "00000000-0000-0000-0000-000000000000", p_column: "views_a" });
    const rpcOk = !error || !error.message.includes("does not exist");
    push({
      key: "db.rpc.increment_ab_counter",
      category: "db_schema",
      label: "RPC increment_ab_counter",
      status: rpcOk ? "ok" : "warn",
      detail: rpcOk ? "已创建" : "未创建 — trackABEvent 走非原子 fallback",
      fix_hint: rpcOk ? undefined : "跑 migrations/add_ab_increment_rpc.sql",
      impact: rpcOk ? undefined : "并发订单转化计数会丢",
    });
  } catch { /* silent */ }

  // ========== DB data 种子 ==========
  const { count: promptsCount } = await supabase.from("prompts").select("id", { head: true, count: "exact" });
  push({
    key: "data.prompts",
    category: "db_data",
    label: "Prompts 种子数据",
    status: (promptsCount || 0) >= 7 ? "ok" : (promptsCount || 0) > 0 ? "warn" : "fail",
    detail: `${promptsCount || 0} 个 prompt 版本 ${(promptsCount || 0) >= 10 ? "(v2 + 专家齐全)" : ""}`,
    fix_hint: (promptsCount || 0) < 7
      ? "跑 seed_core_prompts_v1.sql + seed_judge_prompts.sql + seed_social_prompts_v1.sql + seed_prompts_v2_quality.sql + seed_expert_prompts.sql + seed_ops_diagnostician_and_strategist_v2.sql"
      : undefined,
    impact: (promptsCount || 0) < 7 ? "skill 全部回退硬编码，专家 prompt 失效" : undefined,
  });

  const expertSlugs = ["expert.ops.diagnostician", "expert.ops.strategist", "expert.ads.master", "expert.campaign.master"];
  const { data: expertsFound } = await supabase.from("prompts").select("slug").in("slug", expertSlugs).eq("is_active", true);
  const expertCount = new Set((expertsFound || []).map(p => p.slug)).size;
  push({
    key: "data.experts",
    category: "db_data",
    label: "3+1 顶级专家 prompt",
    status: expertCount === 4 ? "ok" : expertCount > 0 ? "warn" : "fail",
    detail: `${expertCount}/4 专家 prompt 激活（运营诊断官/策划师/广告大师/活动策划）`,
    fix_hint: expertCount < 4 ? "跑 seed_expert_prompts.sql + seed_ops_diagnostician_and_strategist_v2.sql" : undefined,
    impact: expertCount < 4 ? "周计划/活动/广告回退到通用提示词，不像顶级操盘手" : undefined,
  });

  const { count: brandCount } = await supabase.from("brand_guides").select("id", { head: true, count: "exact" });
  push({
    key: "data.brand_guide",
    category: "db_data",
    label: "品牌指南已填写",
    status: (brandCount || 0) > 0 ? "ok" : "fail",
    detail: (brandCount || 0) > 0 ? "已存在一行" : "无品牌指南行",
    fix_hint: (brandCount || 0) === 0 ? "跑 add_brand_guide.sql（含默认行）或去 /brand-guide 填写" : undefined,
    impact: "无品牌上下文注入，AI 输出无一致性",
  });

  const { data: brandRow } = await supabase.from("brand_guides").select("visual_dna, moodboard_urls").limit(1).maybeSingle();
  const hasVisualDna = !!(brandRow?.visual_dna && (brandRow.visual_dna as string).length > 100);
  push({
    key: "data.visual_dna",
    category: "db_data",
    label: "Visual DNA 已生成",
    status: hasVisualDna ? "ok" : "warn",
    detail: hasVisualDna ? "已生成 + moodboard" : "未生成 — 图片 skill 无视觉锚，跨 skill 风格飘",
    fix_hint: "去 /brand-guide 点「生成 Visual DNA」",
    impact: "图片生成一致性差",
  });

  const { count: goalsCount } = await supabase.from("ops_goals").select("id", { head: true, count: "exact" }).eq("status", "active");
  push({
    key: "data.goals",
    category: "db_data",
    label: "运营目标",
    status: (goalsCount || 0) > 0 ? "ok" : "warn",
    detail: `${goalsCount || 0} 个 active 目标`,
    fix_hint: (goalsCount || 0) === 0 ? "driver 会在下次 daily cron 自动 propose + adopt（已接入）；或手动去 /ops-cockpit 点" : undefined,
    impact: (goalsCount || 0) === 0 ? "周计划无方向，auto_replan 失效" : undefined,
  });

  // ========== Integrations ==========
  const { data: shopify } = await supabase.from("integrations")
    .select("id, user_id, status, last_synced_at, store_name, metadata")
    .eq("platform", "shopify").maybeSingle();

  if (!shopify) {
    push({
      key: "int.shopify",
      category: "integration",
      label: "Shopify 店铺",
      status: "fail",
      detail: "未连接",
      fix_hint: "去 /settings → Shopify → 连接",
      impact: "阻塞：商品同步、订单同步、SEO 部署、Page 创建、折扣码创建",
    });
  } else {
    push({
      key: "int.shopify",
      category: "integration",
      label: "Shopify 店铺",
      status: shopify.status === "active" ? "ok" : "fail",
      detail: `${shopify.store_name} · 最近同步 ${shopify.last_synced_at ? new Date(shopify.last_synced_at).toLocaleString("zh-CN") : "从未"}`,
      impact: shopify.status !== "active" ? "同步失败" : undefined,
    });

    push({
      key: "int.shopify.user_id",
      category: "integration",
      label: "Shopify integration.user_id",
      status: shopify.user_id ? "ok" : "warn",
      detail: shopify.user_id ? "已绑定" : "空 — 自动订单同步会跳过",
      fix_hint: shopify.user_id ? undefined : "Supabase 直接 update integrations set user_id='xxx' where platform='shopify'",
      impact: "Daily cron 跳过订单同步 → 周计划拿不到销售数据 → 顶级运营降级成通用 AI",
    });
  }

  const { count: productsCount } = await supabase.from("products").select("id", { head: true, count: "exact" }).eq("platform", "shopify");
  push({
    key: "data.products",
    category: "db_data",
    label: "商品数据",
    status: (productsCount || 0) > 0 ? "ok" : "warn",
    detail: `${productsCount || 0} 个商品`,
    fix_hint: (productsCount || 0) === 0 ? "去 /settings → Shopify → 同步" : undefined,
    impact: "无商品 = 任务没对象，周计划空转",
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count: ordersCount } = await supabase.from("shopify_orders").select("id", { head: true, count: "exact" }).gte("created_at", thirtyDaysAgo);
  push({
    key: "data.orders_30d",
    category: "db_data",
    label: "30 天订单数据",
    status: (ordersCount || 0) > 0 ? "ok" : "warn",
    detail: `${ordersCount || 0} 条订单`,
    fix_hint: (ordersCount || 0) === 0 ? "/settings → Shopify → 同步，或等 daily cron 自动跑" : undefined,
    impact: "无订单 = 诊断官看不到 WoW 趋势 = 周计划拍脑袋",
  });

  const { data: ga4 } = await supabase.from("integrations").select("id, metadata").eq("platform", "google_analytics").eq("status", "active").maybeSingle();
  push({
    key: "int.ga4",
    category: "integration",
    label: "Google Analytics 4",
    status: ga4 ? "ok" : "warn",
    detail: ga4 ? "已连接" : "未连接 — outcomes 测量只能看 SEO 分，拿不到流量变化",
    fix_hint: ga4 ? undefined : "/settings → Google Analytics → 授权",
    impact: "效果测量只看 SEO 分，商业分不全",
  });

  // ========== 活动数据 ==========
  const { count: variantsCount } = await supabase.from("campaign_variants").select("id", { head: true, count: "exact" });
  const { count: declaredWinners } = await supabase.from("campaign_variants").select("id", { head: true, count: "exact" }).not("winner", "is", null);
  push({
    key: "activity.ab_data",
    category: "activity",
    label: "A/B 转化数据",
    status: (variantsCount || 0) === 0 ? "skip" : (declaredWinners || 0) > 0 ? "ok" : "warn",
    detail: `${variantsCount || 0} 组 A/B，${declaredWinners || 0} 个宣告 winner`,
    fix_hint: (variantsCount || 0) > 0 && (declaredWinners || 0) === 0
      ? "tracking snippet 没粘 / webhook 没配 → 无数据上报"
      : undefined,
    impact: "winner 无法自动宣告 → prompt 晋升闭环废掉",
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count: completedTasks7d } = await supabase.from("ops_daily_tasks")
    .select("id", { head: true, count: "exact" })
    .in("execution_status", ["auto_executed", "completed"])
    .gte("updated_at", sevenDaysAgo);
  push({
    key: "activity.delivery_7d",
    category: "activity",
    label: "7 天真实交付",
    status: (completedTasks7d || 0) > 0 ? "ok" : "fail",
    detail: `${completedTasks7d || 0} 个任务成功执行`,
    fix_hint: (completedTasks7d || 0) === 0 ? "cron 没跑或全部失败 — 去 /monitor 看失败聚类" : undefined,
    impact: (completedTasks7d || 0) === 0 ? "系统空转 7 天" : undefined,
  });

  const { count: hourlyCronCount } = await supabase.from("auto_ops_logs")
    .select("id", { head: true, count: "exact" })
    .eq("run_type", "hourly")
    .gte("created_at", new Date(Date.now() - 3 * 3600_000).toISOString());
  push({
    key: "activity.hourly_cron",
    category: "activity",
    label: "Hourly Cron 活跃",
    status: (hourlyCronCount || 0) >= 1 ? "ok" : "fail",
    detail: `最近 3h 内执行 ${hourlyCronCount || 0} 次（应 ≥2）`,
    fix_hint: (hourlyCronCount || 0) === 0 ? "CRON_SECRET 可能没配 / Vercel Cron 未激活 / Hobby plan 不支持 cron" : undefined,
    impact: "Agent Pool 不跑 = 任务永远 pending",
  });

  // ========== 汇总 ==========
  const critical = checks.filter(c => c.status === "fail").length;
  const warnings = checks.filter(c => c.status === "warn").length;
  const oks = checks.filter(c => c.status === "ok").length;
  const total = checks.filter(c => c.status !== "skip").length;
  const score = Math.round((oks / Math.max(1, total)) * 100);

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    score,
    total,
    ok: oks,
    warn: warnings,
    fail: critical,
    critical_blockers: checks.filter(c => c.status === "fail").map(c => c.label),
    checks,
  });
}
