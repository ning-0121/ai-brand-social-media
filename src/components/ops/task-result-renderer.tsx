"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { HtmlPreview } from "./html-preview";

function assembleDetailPageHtml(output: Record<string, unknown>, productName?: string | null): string {
  const title = String(output.title || productName || "");
  const subtitle = String(output.subtitle || "");
  const description = String(output.description || output.body || output.body_html || "");
  const highlights = (output.highlights as string[]) || [];
  const specs = (output.specs as Array<{ name: string; value: string }>) || [];
  const cta = String(output.cta_primary || output.cta || "");
  const hero = String(output.hero_image || output.image_url || "");

  // If description already contains HTML tags, use it; otherwise wrap as text.
  const descHtml = /<[a-z][\s\S]*>/i.test(description)
    ? description
    : `<p>${description.replace(/\n/g, "<br/>")}</p>`;

  return `<article style="max-width:900px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;line-height:1.7">
${hero ? `<img src="${hero}" alt="${title}" style="width:100%;max-height:420px;object-fit:cover;border-radius:12px;margin-bottom:24px"/>` : ""}
${title ? `<h1 style="font-size:32px;font-weight:700;margin:0 0 8px">${title}</h1>` : ""}
${subtitle ? `<p style="font-size:16px;color:#666;margin:0 0 24px">${subtitle}</p>` : ""}
${highlights.length > 0 ? `<ul style="list-style:none;padding:0;margin:0 0 24px">
${highlights.map(h => `<li style="padding:6px 0;border-bottom:1px solid #eee"><span style="color:#22c55e;margin-right:8px">✓</span>${h}</li>`).join("")}
</ul>` : ""}
<div style="font-size:15px;margin-bottom:24px">${descHtml}</div>
${specs.length > 0 ? `<div style="background:#fafafa;border-radius:8px;padding:16px;margin-bottom:24px">
<h3 style="font-size:14px;font-weight:600;margin:0 0 12px">规格参数</h3>
<table style="width:100%;border-collapse:collapse;font-size:13px">
${specs.map(s => `<tr><td style="padding:6px 0;color:#666;width:40%">${s.name}</td><td style="padding:6px 0;font-weight:500">${s.value}</td></tr>`).join("")}
</table></div>` : ""}
${cta ? `<button style="background:#111;color:#fff;border:0;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">${cta}</button>` : ""}
</article>`;
}

interface TaskResultRendererProps {
  taskType: string;
  result: Record<string, unknown> | null;
  targetProductName?: string | null;
}

/**
 * 按 skill 类型渲染可视化结果
 * 不再显示原始 JSON
 */
export function TaskResultRenderer({ taskType, result, targetProductName }: TaskResultRendererProps) {
  if (!result) return <div className="text-xs text-muted-foreground">暂无结果</div>;

  // 错误情况统一处理
  if (result.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-3 space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          执行失败
        </div>
        <p className="text-xs text-red-600 dark:text-red-300">{String(result.error)}</p>
        {result.stack ? (
          <details className="text-[10px] text-red-500 mt-1">
            <summary className="cursor-pointer">技术细节</summary>
            <pre className="mt-1 whitespace-pre-wrap">{String(result.stack).slice(0, 300)}</pre>
          </details>
        ) : null}
      </div>
    );
  }

  if (result.skipped) {
    return (
      <div className="text-xs text-muted-foreground italic">
        跳过：{String(result.reason || "条件不满足")}
      </div>
    );
  }

  const output = (result.output || result.preview || result) as Record<string, unknown>;

  // Image-bearing skills: check output for image_url first regardless of taskType
  const imageUrl = (output.image_url || result.image_url) as string | undefined;
  if (imageUrl) {
    return <ImageResultRenderer output={output} imageUrl={imageUrl} taskType={taskType} productName={targetProductName} />;
  }

  switch (taskType) {
    case "seo_fix":
      return <SEOFixRenderer result={result} output={output} productName={targetProductName} />;
    case "detail_page":
    case "new_product_content":
      return <DetailPageRenderer output={output} productName={targetProductName} />;
    case "post":
      return <SocialPostRenderer output={output} />;
    case "engage":
    case "hashtag_strategy":
    case "content_calendar":
      return <TextContentRenderer output={output} type={taskType} />;
    case "short_video_script":
      return <VideoScriptRenderer output={output} />;
    case "landing_page":
    case "homepage_update":
      return <PageRenderer output={output} />;
    default:
      return <GenericRenderer result={result} />;
  }
}

// ─── 图片结果：大图展示 ──────────────────────────────

function ImageResultRenderer({
  output,
  imageUrl,
  taskType,
  productName,
}: {
  output: Record<string, unknown>;
  imageUrl: string;
  taskType: string;
  productName?: string | null;
}) {
  const typeLabels: Record<string, string> = {
    banner_design: "Banner 广告图",
    social_media_image: "社媒配图",
    campaign_poster: "活动海报",
    ai_product_photo: "AI 商品图",
    post: "社媒帖子图",
  };
  const label = typeLabels[taskType] || "生成图片";
  const headline = output.headline as string | undefined;
  const platform = output.platform as string | undefined;
  const productNameDisplay = (output.product_name as string) || productName;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        <span className="text-sm font-medium">{label} 已生成</span>
        {platform && <Badge className="text-[9px]">{platform}</Badge>}
        {productNameDisplay && (
          <span className="text-xs text-muted-foreground">· {productNameDisplay}</span>
        )}
      </div>
      <div className="rounded-lg overflow-hidden border bg-black">
        <img
          src={imageUrl}
          alt={headline || label}
          className="w-full max-h-72 object-contain"
        />
      </div>
      {headline && (
        <div className="rounded border bg-muted/30 p-2">
          <div className="text-[10px] text-muted-foreground mb-0.5">标题文案</div>
          <p className="text-xs font-medium">{headline}</p>
          {(output.subheadline as string) && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{output.subheadline as string}</p>
          )}
          {(output.cta as string) && (
            <span className="inline-block mt-1 text-[10px] bg-primary text-primary-foreground rounded px-1.5 py-0.5">
              {output.cta as string}
            </span>
          )}
        </div>
      )}
      <a
        href={imageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        在新标签页查看原图
      </a>
    </div>
  );
}

// ─── SEO 修复结果：对比式展示 ────────────────────────

function SEOFixRenderer({
  result,
  output,
  productName,
}: {
  result: Record<string, unknown>;
  output: Record<string, unknown>;
  productName?: string | null;
}) {
  const preview = (result.preview || output) as Record<string, unknown>;
  const qaScore = (result.qa_score as number) || 0;
  const attempts = (result.attempts as number) || 1;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span className="text-sm font-medium">SEO 更新成功</span>
        <Badge className="text-[9px]">QA {qaScore}/100</Badge>
        {attempts > 1 && <Badge variant="outline" className="text-[9px]">{attempts} 次尝试</Badge>}
      </div>

      {productName && <div className="text-xs text-muted-foreground">商品：{productName}</div>}

      <div className="space-y-1.5">
        {preview.meta_title ? (
          <FieldCard label="Meta Title" value={String(preview.meta_title)} />
        ) : null}
        {preview.meta_description ? (
          <FieldCard label="Meta Description" value={String(preview.meta_description)} />
        ) : null}
        {preview.tags ? (
          <FieldCard label="Tags" value={String(preview.tags)} />
        ) : null}
      </div>
    </div>
  );
}

// ─── 详情页：结构化预览 ─────────────────────────────

function DetailPageRenderer({
  output,
  productName,
}: {
  output: Record<string, unknown>;
  productName?: string | null;
}) {
  // Prefer existing body_html if present, otherwise assemble from structured fields.
  const existingHtml = (output.body_html || output.html) as string | undefined;
  const html = existingHtml && existingHtml.length > 100
    ? existingHtml
    : assembleDetailPageHtml(output, productName);

  return (
    <HtmlPreview
      html={html}
      title={productName ? `详情页 · ${productName}` : "详情页"}
    />
  );
}

// ─── 社媒帖子：卡片式 ────────────────────────────────

function SocialPostRenderer({ output }: { output: Record<string, unknown> }) {
  // socialContentPipeline 返回格式
  const post = (output.post || output.posts || output) as Record<string, unknown> | Array<Record<string, unknown>>;

  const posts = Array.isArray(post) ? post : [post];

  return (
    <div className="space-y-2">
      {posts.map((p, i) => (
        <div key={i} className="rounded-lg border bg-background p-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="text-[9px]">帖子 {i + 1}</Badge>
            {p.platform ? <Badge className="text-[9px]">{String(p.platform)}</Badge> : null}
          </div>
          {p.title ? <div className="text-xs font-medium mb-1">{String(p.title)}</div> : null}
          {p.body ? <p className="text-xs whitespace-pre-wrap leading-relaxed">{String(p.body).slice(0, 300)}</p> : null}
          {Array.isArray(p.hashtags) && p.hashtags.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(p.hashtags as string[]).slice(0, 8).map((h, j) => (
                <span key={j} className="text-[10px] text-blue-600">{h}</span>
              ))}
            </div>
          ) : null}
          {p.image_url ? (
            <img src={String(p.image_url)} alt="" className="mt-2 max-h-32 rounded object-cover" />
          ) : null}
        </div>
      ))}
      {output.published !== undefined ? (
        <div className={cn("text-xs", output.published ? "text-green-600" : "text-amber-600")}>
          {output.published ? "✅ 已发布" : "⏳ 已排期"}
        </div>
      ) : null}
    </div>
  );
}

// ─── 文本内容：标签 / 日历 / 互动 ────────────────────

function TextContentRenderer({ output, type }: { output: Record<string, unknown>; type: string }) {
  const title = type === "hashtag_strategy" ? "标签策略" : type === "content_calendar" ? "内容日历" : "生成内容";

  return (
    <div className="rounded-lg border bg-background p-3 space-y-2">
      <Badge variant="outline" className="text-[9px]">{title}</Badge>
      {Object.entries(output).slice(0, 6).map(([key, value]) => {
        if (Array.isArray(value)) {
          return (
            <div key={key}>
              <div className="text-[10px] font-medium text-muted-foreground mb-1">{key}</div>
              <div className="flex flex-wrap gap-1">
                {(value as unknown[]).slice(0, 12).map((v, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    {typeof v === "string" ? v : JSON.stringify(v).slice(0, 30)}
                  </Badge>
                ))}
              </div>
            </div>
          );
        }
        if (typeof value === "string") {
          return (
            <div key={key}>
              <div className="text-[10px] font-medium text-muted-foreground">{key}</div>
              <p className="text-xs whitespace-pre-wrap">{value.slice(0, 300)}</p>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

// ─── 视频脚本：时间线 ──────────────────────────────

function VideoScriptRenderer({ output }: { output: Record<string, unknown> }) {
  const scenes = (output.scenes as Array<Record<string, unknown>>) || [];
  const duration = output.duration ? String(output.duration) : "60s";

  return (
    <div className="rounded-lg border bg-background p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[9px]">视频脚本</Badge>
        <span className="text-[10px] text-muted-foreground">{duration}</span>
      </div>
      {output.hook ? (
        <div className="border-l-2 border-orange-400 pl-2">
          <div className="text-[10px] font-medium text-orange-600">Hook</div>
          <p className="text-xs">{String(output.hook)}</p>
        </div>
      ) : null}
      {scenes.map((scene, i) => (
        <div key={i} className="border-l-2 border-blue-400 pl-2">
          <div className="text-[10px] font-medium text-blue-600">场景 {i + 1} · {String(scene.timing || `${i * 5}s`)}</div>
          <p className="text-xs">{String(scene.voiceover || scene.description || "")}</p>
        </div>
      ))}
      {output.cta ? (
        <div className="border-l-2 border-green-400 pl-2">
          <div className="text-[10px] font-medium text-green-600">CTA</div>
          <p className="text-xs">{String(output.cta)}</p>
        </div>
      ) : null}
    </div>
  );
}

// ─── 页面 (landing / homepage) ──────────────────────

function PageRenderer({ output }: { output: Record<string, unknown> }) {
  // Skills like homepage_hero / landing_page return body_html directly.
  // Fallback: assemble from hero_title / hero_subtitle / sections if only structured data exists.
  let html = (output.body_html || output.html || output.raw_text) as string | undefined;

  if (!html || html.length < 50) {
    const heroTitle = String(output.hero_title || output.title || "");
    const heroSub = String(output.hero_subtitle || output.subtitle || "");
    const imageUrl = String(output.image_url || "");
    const sections = (output.sections as Array<Record<string, unknown>>) || [];
    html = `<section style="text-align:center;padding:64px 24px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white">
${heroTitle ? `<h1 style="font-size:48px;font-weight:800;margin:0 0 16px">${heroTitle}</h1>` : ""}
${heroSub ? `<p style="font-size:20px;opacity:0.9;max-width:640px;margin:0 auto">${heroSub}</p>` : ""}
${imageUrl ? `<img src="${imageUrl}" style="max-width:800px;margin:32px auto 0;border-radius:12px"/>` : ""}
</section>
${sections.map(s => `<section style="max-width:900px;margin:0 auto;padding:48px 24px">
<h2 style="font-size:28px;font-weight:700;margin:0 0 16px">${String(s.title || "")}</h2>
<p style="font-size:16px;line-height:1.7;color:#444">${String(s.content || "")}</p>
</section>`).join("")}`;
  }

  const pageId = output.page_id ? String(output.page_id) : null;

  return (
    <div className="space-y-2">
      <HtmlPreview html={html} title="页面预览" defaultViewport="desktop" />
      {pageId && (
        <div className="text-[10px] text-green-600 px-2">✅ 已创建 Shopify 页面 (ID: {pageId})</div>
      )}
    </div>
  );
}

// ─── 通用兜底 ─────────────────────────────────────

function GenericRenderer({ result }: { result: Record<string, unknown> }) {
  const action = result.action;

  return (
    <div className="space-y-1.5">
      {action ? (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px]">{String(action)}</Badge>
        </div>
      ) : null}
      {Object.entries(result)
        .filter(([key]) => key !== "action" && key !== "stack")
        .slice(0, 8)
        .map(([key, value]) => {
          if (value === null || value === undefined) return null;
          const str = typeof value === "string" ? value : JSON.stringify(value);
          if (str.length < 3) return null;
          return (
            <div key={key} className="text-xs">
              <span className="text-muted-foreground">{key}:</span>{" "}
              <span>{str.slice(0, 200)}</span>
            </div>
          );
        })}
    </div>
  );
}

// ─── 字段卡片 ─────────────────────────────────────

function FieldCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-muted/30 p-2">
      <div className="text-[10px] font-medium text-muted-foreground mb-0.5">{label}</div>
      <p className="text-xs break-words">{value}</p>
    </div>
  );
}
