"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Copy, Check, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { HtmlPreview } from "./html-preview";
import { ImageTemplateRenderer } from "./image-template-renderer";
import { getTemplate } from "./image-templates";
import type { TemplateData } from "./image-template-renderer";

interface SkillResultViewerProps {
  skillId: string;
  skillName: string;
  taskId?: string;
  result: Record<string, unknown>;
  onClose: () => void;
}

export function SkillResultViewer({ skillId, skillName, taskId, result, onClose }: SkillResultViewerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/content-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_approval",
          task_id: taskId,
          title: `[${skillName}] ${getResultTitle(result)}`,
          description: `Skill: ${skillName}\n${JSON.stringify(result).slice(0, 300)}`,
          payload: { skill_id: skillId, result },
        }),
      });
      if ((await res.json()).success) setSubmitted(true);
    } catch {
      toast.error("提交失败");
    }
    setSubmitting(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{skillName} 生成结果</h3>
          <p className="text-xs text-muted-foreground">AI 已生成内容，可直接提交审批</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>关闭</Button>
        </div>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {/* Special rendering for HTML results (detail pages, campaign pages) */}
        {typeof result.body_html === "string" && (
          <HtmlPreview html={result.body_html as string} />
        )}

        {/* Special rendering for image template results */}
        {typeof result.template_id === "string" && (() => {
          const tpl = getTemplate(result.template_id as string);
          if (!tpl) return null;
          const data: TemplateData = {
            headline: (result.headline as string) || "",
            subheadline: (result.subheadline as string) || undefined,
            cta: (result.cta as string) || undefined,
            productImageUrl: (result.product_image_url as string) || undefined,
            backgroundColor: (result.backgroundColor as string) || undefined,
            textColor: (result.textColor as string) || undefined,
            accentColor: (result.accentColor as string) || undefined,
            brandName: (result.brandName as string) || undefined,
            discount: (result.discount as string) || undefined,
            badge: (result.badge as string) || undefined,
          };
          return <ImageTemplateRenderer template={tpl} data={data} />;
        })()}

        {/* Special rendering for AI image prompts */}
        {typeof result.image_prompt === "string" && !result.template_id && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <ImageIcon className="h-3.5 w-3.5" />
              AI 图片 Prompt
            </div>
            <p className="text-xs text-muted-foreground">{result.image_prompt as string}</p>
            <p className="text-[10px] text-muted-foreground">点击下方提交审批后，可在审批通过时调用图片生成 API</p>
          </div>
        )}

        {/* Generic JSON rendering for everything else */}
        {!result.body_html && !result.template_id && (
          <ResultRenderer result={result} />
        )}
      </div>

      {!submitted ? (
        <div className="flex gap-2 pt-2 border-t">
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />提交中...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" />提交审批</>
            )}
          </Button>
        </div>
      ) : (
        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 text-center">
          ✓ 已提交审批，前往审批中心查看
        </div>
      )}
    </Card>
  );
}

function getResultTitle(result: Record<string, unknown>): string {
  if (result.title) return String(result.title);
  if (result.campaign_name) return String(result.campaign_name);
  if (result.brief_title) return String(result.brief_title);
  if (Array.isArray((result as { posts?: unknown[] }).posts)) return "社媒帖子包";
  return "AI 生成内容";
}

function ResultRenderer({ result }: { result: Record<string, unknown> }) {
  // 通用渲染：把 JSON 优雅地展示
  return (
    <div className="space-y-2">
      {Object.entries(result).map(([key, value]) => (
        <ResultField key={key} fieldKey={key} value={value} />
      ))}
    </div>
  );
}

function ResultField({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  if (value === null || value === undefined) return null;

  // 字符串
  if (typeof value === "string") {
    return (
      <div className="text-xs">
        <span className="font-medium text-muted-foreground">{formatKey(fieldKey)}: </span>
        <span>{value}</span>
      </div>
    );
  }

  // 数字/布尔
  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <div className="text-xs">
        <span className="font-medium text-muted-foreground">{formatKey(fieldKey)}: </span>
        <span>{String(value)}</span>
      </div>
    );
  }

  // 数组
  if (Array.isArray(value)) {
    if (value.length === 0) return null;

    // 标签数组
    if (value.every((v) => typeof v === "string")) {
      return (
        <div className="text-xs">
          <p className="font-medium text-muted-foreground mb-1">{formatKey(fieldKey)}:</p>
          <div className="flex flex-wrap gap-1">
            {value.map((v, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{v}</Badge>
            ))}
          </div>
        </div>
      );
    }

    // 对象数组
    return (
      <div className="text-xs">
        <p className="font-medium text-muted-foreground mb-1">{formatKey(fieldKey)}:</p>
        <div className="space-y-1.5 pl-3 border-l-2 border-muted">
          {value.map((item, i) => (
            <div key={i} className="rounded bg-muted/50 p-2">
              {typeof item === "object" && item !== null ? (
                Object.entries(item).map(([k, v]) => (
                  <ResultField key={k} fieldKey={k} value={v} />
                ))
              ) : (
                <span>{String(item)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 对象
  if (typeof value === "object") {
    return (
      <div className="text-xs">
        <p className="font-medium text-muted-foreground mb-1">{formatKey(fieldKey)}:</p>
        <div className="rounded bg-muted/50 p-2 space-y-1">
          {Object.entries(value).map(([k, v]) => (
            <ResultField key={k} fieldKey={k} value={v} />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function formatKey(key: string): string {
  const labels: Record<string, string> = {
    title: "标题", subtitle: "副标题", body: "正文", description: "描述",
    meta_title: "Meta 标题", meta_description: "Meta 描述", tags: "标签",
    cta: "CTA", cta_primary: "主 CTA", cta_secondary: "次 CTA",
    highlights: "亮点", specs: "规格", improvements: "改进点",
    hero: "Hero 区", value_propositions: "价值主张", featured_section: "精选区",
    campaign_banner: "活动横幅", newsletter_cta: "邮件订阅", footer_tagline: "Footer 标语",
    campaign_name: "活动名称", campaign_slogan: "Slogan", landing_page: "落地页",
    promotion_plan: "推广计划", ad_copy: "广告文案", expected_metrics: "预期指标",
    posts: "帖子", platform: "平台", angle: "角度", image_prompt: "配图 prompt",
    hashtags: "标签", scenes: "场景", hook: "钩子", voiceover: "旁白",
    bgm_suggestion: "BGM 建议", calendar: "日历", themes_overview: "主题概览",
    core_hashtags: "核心标签", long_tail_hashtags: "长尾标签", trending_hashtags: "趋势标签",
    brand_hashtags: "品牌标签", brief_title: "Brief 标题", product_facts: "商品信息",
    must_includes: "必须包含", must_avoid: "必须避免", creative_direction: "创意方向",
    shooting_requirements: "拍摄要求", script_outline: "脚本大纲", deliverables: "交付物",
    kpis: "KPIs", analysis: "分析", responses: "回复", next_actions: "下一步",
    ugc_amplification: "二次传播", collaboration_invite: "合作邀请",
    navigation_structure: "导航结构", category_tree: "分类树",
    related_products_strategy: "关联策略", internal_search_keywords: "内部搜索词",
    internal_linking: "内部链接", discount_strategy: "折扣策略",
    product_bundles: "商品组合", promotion_schedule: "推广日程", expected_results: "预期结果",
    key_messages: "核心信息",
  };
  return labels[key] || key;
}
