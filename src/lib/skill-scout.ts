/**
 * Skill Scout — 自动学习引擎
 * 每周两次扫描 GitHub 和全网，发现能提升系统能力的工具和方法
 * 评估后生成集成建议，提交审批
 */

import { supabase } from "./supabase";
import { callLLM } from "./content-skills/llm";
import { createApprovalTask } from "./supabase-approval";

interface ScoutResult {
  source: string;
  name: string;
  url: string;
  description: string;
  relevance_score: number;
  capability_gap: string;
  integration_difficulty: "easy" | "medium" | "hard";
  estimated_value: string;
}

interface ScoutReport {
  scanned_at: string;
  sources_checked: number;
  findings: ScoutResult[];
  top_recommendations: string[];
}

// ─── GitHub API 搜索 ────────────────────────────────────────

async function searchGitHub(query: string, sort = "stars"): Promise<Array<Record<string, unknown>>> {
  try {
    const token = process.env.GITHUB_TOKEN; // optional, increases rate limit
    const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&order=desc&per_page=10`,
      { headers }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((r: Record<string, unknown>) => ({
      name: r.full_name,
      url: r.html_url,
      description: r.description || "",
      stars: r.stargazers_count,
      updated: r.updated_at,
      language: r.language,
      topics: r.topics,
    }));
  } catch {
    return [];
  }
}

// ─── 扫描各个能力维度 ──────────────────────────────────────

async function scanForCapabilities(): Promise<Array<Record<string, unknown>>> {
  const queries = [
    // 电商运营
    "MCP server shopify e-commerce",
    "shopify automation AI agent 2025",
    "e-commerce conversion optimization open source",
    // 广告投放
    "MCP server google ads meta ads tiktok",
    "AI ad campaign optimization",
    // 社媒运营
    "MCP server instagram tiktok social media automation",
    "AI social media content generation",
    // SEO
    "MCP server SEO google search console",
    "AI SEO optimization e-commerce",
    // 邮件营销
    "shopify email marketing automation klaviyo",
    "abandoned cart recovery open source",
    // 图片/视频
    "AI product photo generation e-commerce",
    "AI video creation short form content",
    // 数据分析
    "MCP server analytics dashboard",
    "AI e-commerce analytics insights",
  ];

  const allResults: Array<Record<string, unknown>> = [];

  // 每次扫描随机选 5 个维度（避免 GitHub API 限制）
  const selectedQueries = queries.sort(() => Math.random() - 0.5).slice(0, 5);

  for (const query of selectedQueries) {
    const results = await searchGitHub(query);
    allResults.push(...results.map(r => ({ ...r, search_query: query })));
    // 简单限速
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return allResults;
}

// ─── 当前系统能力清单（用于对比）───────────────────────────

function getCurrentCapabilities(): string[] {
  return [
    "shopify-product-sync", "shopify-seo-update", "shopify-body-html-update",
    "seo-scoring", "seo-optimize", "technical-seo-audit", "core-web-vitals",
    "google-search-console", "google-shopping-feed",
    "google-ads-api", "meta-ads-api", "tiktok-ads-api",
    "instagram-graph-api", "instagram-carousel", "instagram-reels",
    "facebook-page-posting",
    "gemini-image-generation", "social-media-image", "campaign-poster", "banner-design",
    "product-detail-page", "landing-page", "homepage-hero",
    "content-calendar", "hashtag-strategy", "social-post-pack", "short-video-script",
    "email-abandoned-cart", "email-welcome", "email-post-purchase",
    "product-review-collection",
    "store-audit", "store-growth-planner",
    "competitor-analysis", "pricing-analysis",
    "approval-workflow", "ops-director", "weekly-plan", "auto-execute",
  ];
}

// ─── AI 评估发现的工具 ──────────────────────────────────────

export async function runSkillScout(): Promise<ScoutReport> {
  const scannedAt = new Date().toISOString();

  // 1. 扫描 GitHub
  const rawResults = await scanForCapabilities();

  if (rawResults.length === 0) {
    return {
      scanned_at: scannedAt,
      sources_checked: 0,
      findings: [],
      top_recommendations: ["GitHub API 暂时不可用，下次重试"],
    };
  }

  // 2. 去重（同一个 repo 可能在多个搜索中出现）
  const seen = new Set<string>();
  const unique = rawResults.filter(r => {
    const key = r.name as string;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 3. AI 评估
  const currentCaps = getCurrentCapabilities();

  const evaluation = await callLLM(
    `你是 AI 系统架构师。评估以下 GitHub 项目，找出对我们的电商运营 SaaS 最有价值的。

我们已有的能力：${currentCaps.join(", ")}

评估规则：
1. 只推荐我们还没有的能力（不要重复推荐已有的）
2. 优先推荐：star 多的、最近更新的、与电商直接相关的
3. 排除：demo 项目、archived 项目、与我们无关的
4. 每个推荐说明：填补什么能力缺口、集成难度、预期价值

返回 JSON：
{
  "findings": [
    {
      "name": "repo name",
      "url": "github url",
      "description": "一句话说明",
      "relevance_score": 1-10,
      "capability_gap": "填补什么缺口",
      "integration_difficulty": "easy/medium/hard",
      "estimated_value": "预期价值"
    }
  ],
  "top_recommendations": ["最值得集成的 3 个，一句话说明为什么"]
}`,
    `GitHub 扫描结果（${unique.length} 个项目）：
${unique.slice(0, 30).map(r => `- ${r.name} (⭐${r.stars}) — ${(r.description as string || "").slice(0, 100)}`).join("\n")}`,
    2000
  );

  const findings = ((evaluation as Record<string, unknown>).findings as ScoutResult[]) || [];
  const topRecs = ((evaluation as Record<string, unknown>).top_recommendations as string[]) || [];

  // 4. 存储结果
  await supabase.from("auto_ops_logs").insert({
    run_type: "skill_scout",
    trigger_source: "scheduled",
    results_summary: {
      sources_checked: unique.length,
      findings_count: findings.length,
      top_recommendations: topRecs,
    },
    duration_ms: Date.now() - new Date(scannedAt).getTime(),
  });

  // 5. 如果有高价值发现，创建审批任务
  const highValue = findings.filter(f => f.relevance_score >= 7);
  if (highValue.length > 0) {
    await createApprovalTask({
      type: "products",
      title: `[Skill Scout] 发现 ${highValue.length} 个高价值工具`,
      description: `AI 自动扫描发现以下工具可提升系统能力：\n\n${highValue.map(f => `• **${f.name}** (${f.relevance_score}/10)\n  ${f.capability_gap}\n  难度: ${f.integration_difficulty} | 价值: ${f.estimated_value}\n  ${f.url}`).join("\n\n")}\n\n审批后将安排集成。`,
      payload: {
        scout_type: "github_scan",
        findings: highValue,
        top_recommendations: topRecs,
        scanned_at: scannedAt,
      },
    });
  }

  return {
    scanned_at: scannedAt,
    sources_checked: unique.length,
    findings,
    top_recommendations: topRecs,
  };
}
