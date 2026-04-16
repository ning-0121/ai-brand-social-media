"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const title = String(output.title || productName || "");
  const subtitle = String(output.subtitle || "");
  const description = String(output.description || output.body || "");
  const highlights = (output.highlights as string[]) || [];
  const specs = (output.specs as Array<{ name: string; value: string }>) || [];
  const cta = String(output.cta_primary || output.cta || "Shop Now");

  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[9px]">详情页预览</Badge>
      </div>

      {title ? (
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {subtitle ? <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p> : null}
        </div>
      ) : null}

      {highlights.length > 0 ? (
        <div>
          <div className="text-[10px] font-medium text-muted-foreground mb-1">卖点</div>
          <ul className="space-y-0.5">
            {highlights.map((h, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {description ? (
        <div>
          <div className="text-[10px] font-medium text-muted-foreground mb-1">描述</div>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{description.slice(0, 500)}{description.length > 500 ? "..." : ""}</p>
        </div>
      ) : null}

      {specs.length > 0 ? (
        <div>
          <div className="text-[10px] font-medium text-muted-foreground mb-1">规格参数</div>
          <div className="grid grid-cols-2 gap-1.5">
            {specs.slice(0, 6).map((s, i) => (
              <div key={i} className="text-[11px] flex justify-between gap-2 border-b pb-1">
                <span className="text-muted-foreground">{s.name}</span>
                <span className="font-medium text-right">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {cta ? (
        <div className="pt-2">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium">
            {cta} <ExternalLink className="h-3 w-3" />
          </div>
        </div>
      ) : null}
    </div>
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
  return (
    <div className="rounded-lg border bg-background p-3 space-y-2">
      <Badge variant="outline" className="text-[9px]">页面内容</Badge>
      {output.hero_title ? <h3 className="text-base font-semibold">{String(output.hero_title)}</h3> : null}
      {output.hero_subtitle ? <p className="text-xs text-muted-foreground">{String(output.hero_subtitle)}</p> : null}
      {output.image_url ? (
        <img src={String(output.image_url)} alt="" className="max-h-48 rounded object-cover" />
      ) : null}
      {output.sections && Array.isArray(output.sections) ? (
        <div className="space-y-1">
          {(output.sections as Array<Record<string, unknown>>).slice(0, 3).map((s, i) => (
            <div key={i} className="text-xs border-l-2 border-muted pl-2">
              <strong>{String(s.title || `Section ${i + 1}`)}</strong>: {String(s.content || "").slice(0, 150)}
            </div>
          ))}
        </div>
      ) : null}
      {output.page_id ? (
        <div className="text-[10px] text-green-600">✅ 已创建 Shopify 页面 (ID: {String(output.page_id)})</div>
      ) : null}
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
