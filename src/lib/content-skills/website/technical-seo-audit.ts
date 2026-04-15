import { auditPageSEO, getCoreWebVitals } from "../../advanced-seo";
import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const technicalSeoAuditSkill: ContentSkill = {
  id: "technical_seo_audit",
  name: "技术 SEO 审计",
  category: "website",
  description: "深度审计页面技术 SEO — 标签、Schema、Core Web Vitals、图片 alt",
  icon: "Search",
  color: "green",
  estimated_cost: { text: 0.01, image: 0 },
  estimated_time_seconds: 15,
  agents: ["store_optimizer"],
  inputs: [
    { key: "url", label: "要审计的页面 URL", type: "text", required: true, placeholder: "https://jojofeifei.com/products/..." },
    { key: "check_vitals", label: "检查 Core Web Vitals", type: "select", default: "yes", options: [
      { value: "yes", label: "是" },
      { value: "no", label: "否（更快）" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const url = input.url as string;
    if (!url) throw new Error("请输入页面 URL");

    const audit = await auditPageSEO(url);
    if (!audit) throw new Error("无法访问该页面");

    let vitals = null;
    if (input.check_vitals !== "no") {
      vitals = await getCoreWebVitals(url);
    }

    // AI 生成诊断摘要
    const diagnosis = await callLLM(
      "你是技术 SEO 专家。用 2-3 句话诊断这个页面的 SEO 问题，并给出最重要的 3 个修复建议。直接说，不要废话。",
      `页面：${url}
SEO 分数：${audit.score}/100
问题：${audit.issues.join("; ") || "无"}
结构化数据：${audit.structured_data.found ? audit.structured_data.types.join(", ") : "无"}
Core Web Vitals：${vitals ? `性能 ${vitals.performance_score}/100, LCP ${vitals.lcp.value}ms (${vitals.lcp.rating}), CLS ${vitals.cls.value} (${vitals.cls.rating})` : "未检查"}
返回纯文本，不要 JSON。`,
      500
    );

    return {
      skill_id: "technical_seo_audit",
      output: {
        audit,
        vitals,
        diagnosis: typeof diagnosis === "string" ? diagnosis : (diagnosis as Record<string, unknown>).raw_text || "",
      },
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0 },
    };
  },
};
