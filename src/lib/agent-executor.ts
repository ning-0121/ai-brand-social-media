import Anthropic from "@anthropic-ai/sdk";
import { getAgentConfigs } from "./agent-configs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function executeAgent(
  agentName: string,
  taskType: string,
  input: Record<string, unknown>,
  workflowContext: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const configs = getAgentConfigs(agentName);
  const taskConfig = configs[taskType];

  if (!taskConfig) {
    throw new Error(`Agent "${agentName}" 没有 "${taskType}" 任务配置`);
  }

  // Gather additional data if needed
  const additionalData = taskConfig.dataQueries
    ? await taskConfig.dataQueries()
    : {};

  // Build the prompt
  const userPrompt = taskConfig.buildPrompt(input, additionalData, workflowContext);

  // Get scene config for system prompt and format hint
  const sceneConfig = getScenePrompt(taskConfig.scene);

  // Call Claude
  const systemPrompt = taskConfig.systemPromptOverride
    ? `${taskConfig.systemPromptOverride}\n\n输出格式要求：\n${sceneConfig.formatHint}`
    : `${sceneConfig.system}\n\n输出格式要求：\n${sceneConfig.formatHint}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    system: systemPrompt,
    messages: [
      { role: "user", content: userPrompt },
    ],
  });

  const content = message.content[0]?.type === "text" ? message.content[0].text : "{}";

  // Parse JSON response
  let result: Record<string, unknown>;
  try {
    const jsonMatch = content.match(/[\[{][\s\S]*[\]}]/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    result = Array.isArray(parsed) ? { items: parsed } : parsed;
  } catch {
    result = { raw_text: content };
  }

  // Run post-processing if defined
  if (taskConfig.postProcess) {
    await taskConfig.postProcess(result, {} as import("./agent-types").WorkflowTask, workflowContext);
  }

  return result;
}

// Scene prompts (extracted from existing /api/generate/route.ts pattern)
function getScenePrompt(scene: string): { system: string; formatHint: string } {
  const scenes: Record<string, { system: string; formatHint: string }> = {
    seo_optimize: {
      system: "你是一个电商 SEO 专家，擅长优化产品页面和独立站 SEO。根据产品信息，给出具体可执行的 SEO 优化建议。",
      formatHint: '返回 JSON 数组：[{"category":"标题","priority":"high","current":"问题","suggestion":"建议"}]',
    },
    seo_apply: {
      system: "你是全球顶级电商 SEO 专家，精通 Google E-E-A-T 算法、搜索意图匹配和转化率优化。生成可直接应用到 Shopify 的 SEO 文案。关键词自然融入（密度1-2%），主关键词出现在标题前半部分和首段。body_html 需含 JSON-LD 结构化数据、H2/H3 标题结构和列表。",
      formatHint: '返回 JSON：{"title":"","body_html":"","meta_title":"","meta_description":"","tags":"","handle_suggestion":"","seo_analysis":{"detected_language":"","primary_keyword":"","secondary_keywords":[],"search_intent":"","optimization_reasoning":""}}',
    },
    ad_copy: {
      system: "你是资深广告投放专家，擅长写高点击率广告文案。",
      formatHint: '返回 JSON 数组：[{"title":"","body":"","cta":""}]',
    },
    ad_optimization: {
      system: "你是广告投放优化专家，擅长分析广告数据并给出预算和策略调整建议。",
      formatHint: '返回 JSON：{"overall_assessment":"","budget_suggestions":[],"optimization_tips":[],"stop_suggestions":[],"scale_suggestions":[]}',
    },
    brand_analysis: {
      system: "你是资深品牌策略顾问，擅长品牌定位分析。",
      formatHint: '返回 JSON：{"positioning":"","target_audience":"","core_values":[],"differentiators":[],"tone_keywords":[],"suggestions":[]}',
    },
    persona_generation: {
      system: "你是用户研究专家，擅长根据品牌信息构建目标用户画像。",
      formatHint: '返回 JSON 数组：[{"name":"","age":25,"occupation":"","pain_points":[],"motivations":[],"platforms":[]}]',
    },
    trend_search: {
      system: "你是专业电商市场研究分析师，拥有各大电商平台的最新市场数据知识。返回该品类的热门商品趋势数据。",
      formatHint: '返回 JSON 数组：[{"name":"","category":"","sales_volume":0,"growth_rate":0,"trend":"up","price_range":"","rating":4.5,"insight":""}]',
    },
    competitor_search: {
      system: "你是专业竞品情报分析师。返回该领域的主要竞争品牌/店铺信息。",
      formatHint: '返回 JSON 数组：[{"name":"","top_category":"","followers":0,"avg_engagement":0,"growth_rate":0,"trend":"up","recent_campaigns":0,"insight":""}]',
    },
    content_package: {
      system: "你是全能品牌内容创作专家，擅长制作完整的社交媒体内容包。",
      formatHint: '返回 JSON：{"title":"","body":"","hashtags":[],"image_prompt":"","cta":""}',
    },
    social_scheduling: {
      system: "你是社交媒体运营专家，擅长分析最佳发布时间和内容策略。",
      formatHint: '返回 JSON：{"scheduling_strategy":"","best_times":[],"frequency_suggestions":[],"content_calendar_tips":[]}',
    },
    influencer_analysis: {
      system: "你是达人营销专家，擅长评估达人与品牌的匹配度。",
      formatHint: '返回 JSON：{"match_score":85,"strengths":[],"risks":[],"recommendation":"","estimated_roi":""}',
    },
    diagnostic_seo: {
      system: "You are a senior Shopify store diagnostic expert. Group related issues into findings. Each finding must include the actual product UUIDs from the prompt (NOT names). Severity reflects business impact and number of products affected.",
      formatHint: 'Return JSON array: [{"category":"seo|product|inventory","severity":"critical|high|medium|low","title":"短标题","description":"详细说明","affected_product_ids":["uuid1","uuid2"],"recommended_action_type":"seo_update|product_edit|inventory_update","recommended_action_label":"修复按钮文案"}]. CRITICAL: affected_product_ids MUST be the bracketed UUIDs from the prompt, never names.',
    },
    diagnostic_sales: {
      system: "你是资深电商数据分析师。根据店铺销售数据和内容数据进行诊断，找出销售趋势问题、内容缺口和增长机会。将问题归类为 findings，每个 finding 代表一类问题。",
      formatHint: '返回 JSON 数组：[{"category":"sales|content","severity":"critical|high|medium|low","title":"问题标题","description":"详细说明","affected_product_names":["商品名1"],"recommended_action_type":"content_publish|workflow_launch|info_only","recommended_action_label":"建议操作按钮文案"}]',
    },
    ai_daily_insight: {
      system: "你是资深电商运营总监。根据运营数据给出 3-5 条今日最重要的可执行行动建议。",
      formatHint: '返回 JSON：{"greeting":"","priority_actions":[{"title":"","description":"","priority":"high","category":""}],"insight":""}',
    },
    content: {
      system: "你是专业的品牌内容运营专家。根据主题生成内容。",
      formatHint: '返回 JSON 数组：[{"title":"","body":""}]',
    },
  };

  return scenes[scene] || {
    system: "你是专业的品牌运营 AI 助手。",
    formatHint: "返回 JSON。",
  };
}
