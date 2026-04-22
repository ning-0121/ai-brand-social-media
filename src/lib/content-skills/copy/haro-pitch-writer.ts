import { callLLM } from "../llm";
import { getBrandGuide } from "../../brand-guide";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

/**
 * haro_pitch_writer — 从记者询问 → 自动写专家 pitch
 *
 * HARO / Featured.com / Qwoted 每天发百个记者询问邮件。
 * 规则：100+ 字简明回答，第一句直接回答问题，最后附品牌简介
 * 研究：5-15% 中标率，每个外链 DR40+ 价值 ~$200-500
 */
export const haroPitchWriterSkill: ContentSkill = {
  id: "haro_pitch_writer",
  name: "HARO 记者询问 Pitch",
  category: "copy",
  description: "从记者询问自动生成专家回复 + 品牌角度推荐。建 E-E-A-T + 高质量外链",
  icon: "Mic2",
  color: "amber",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 20,
  agents: ["content_producer"],
  inputs: [
    { key: "journalist_query", label: "记者询问全文", type: "textarea", required: true, placeholder: "粘贴 HARO 邮件或 Featured 询问" },
    { key: "publication", label: "发布媒体", type: "text", placeholder: "如：Forbes, Cosmopolitan" },
    { key: "deadline", label: "截止日期（可选）", type: "text", placeholder: "如：2026-04-24" },
    { key: "expert_role", label: "以什么身份回答", type: "select", default: "founder", options: [
      { value: "founder", label: "品牌创始人" },
      { value: "designer", label: "设计师" },
      { value: "cmo", label: "营销负责人" },
      { value: "sustainability_lead", label: "可持续性负责人" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const query = (input.journalist_query as string) || "";
    const publication = (input.publication as string) || "";
    const deadline = (input.deadline as string) || "";
    const role = (input.expert_role as string) || "founder";

    const guide = await getBrandGuide();
    const brandContext = guide ? `
品牌：${guide.brand_name}
定位：${guide.one_liner || ""}
独特卖点：${(guide.differentiators || []).slice(0, 3).join(" · ")}
创始人能讲的故事：${guide.mission || ""}` : "";

    const output = await callLLM(
      `你是 PR / 公关专家，专门做 HARO-style journalist pitching。成功率 15%+（行业平均 5%）。

**好 pitch 的 7 个黄金规则**：
1. **第一句直接回答记者问题**（不寒暄，不拍马屁）
2. **100-200 字上限**（记者每天看 200+ 封，精简即尊重）
3. **具体数据/案例**（"我们 2026 年做了 X，结果 Y"）
4. **独特角度**（不要说 "我同意"，要给新观点）
5. **避免推销**（只提一次品牌，放最后）
6. **附件式品牌 bio**（30 字内：姓名 + 身份 + 成就）
7. **专业邮件签名**（职位 + LinkedIn + 品牌网址）

**常见错误**：
- ❌ 长段落、满嘴"协同赋能"
- ❌ 直接发新闻稿
- ❌ 没关联记者具体问题

返回 JSON：
{
  "match_score": "这个问题和我们的契合度 1-10（1=别投了）",
  "match_rationale": "为什么匹配/不匹配",
  "pitch_subject_line": "邮件主题（记者一眼看出你要答的是哪条询问）",
  "pitch_body": "完整 pitch 正文（100-200字）",
  "pitch_word_count": 数字,
  "unique_angle": "这个 pitch 的独特角度（一句话）",
  "expert_bio_line": "一句话 bio（30字内）",
  "signature_block": "邮件签名块",
  "followup_strategy": {
    "if_no_response_in_days": 3,
    "followup_subject": "二封邮件主题"
  },
  "link_opportunity": "如果被引用，建议链到哪个我方 URL（产品/博客/首页）",
  "red_flags": ["如果这个询问有疑点（比如低质媒体），标出来"]
}`,
      `记者询问：
"""
${query}
"""

发布媒体：${publication || "未指定"}
截止：${deadline || "未指定"}
回答身份：${role}
${brandContext}

请生成 pitch。如果匹配度 < 5 也要老实说，不浪费时间。`,
      3000
    );

    return {
      skill_id: "haro_pitch_writer",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
