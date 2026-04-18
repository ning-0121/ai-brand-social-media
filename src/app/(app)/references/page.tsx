"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { HtmlPreview } from "@/components/ops/html-preview";
import { Loader2, Link as LinkIcon, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ScrapeResult {
  source_url: string;
  title: string | null;
  text_excerpt: string;
  structure_summary: {
    hero_hook?: string;
    value_framing?: string;
    social_proof_type?: string;
    cta_strategy?: string;
    urgency_tactics?: string;
    sections_observed?: string[];
    what_works?: string[];
    what_to_beat?: string[];
    rewrite_angle?: string;
  };
  rewritten_html?: string;
  rewritten_notes?: string[];
  improvements?: string[];
}

export default function ReferencesPage() {
  const [url, setUrl] = useState("");
  const [goal, setGoal] = useState("landing page rewrite");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  const scrape = async () => {
    if (!url) { toast.error("请填 URL"); return; }
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/references/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, goal, rewrite: true }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "failed");
      setResult(d.result);
      toast.success("拆解 + 重写完成");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "失败");
    }
    setRunning(false);
  };

  const s = result?.structure_summary as ScrapeResult["structure_summary"] | undefined;

  return (
    <div className="space-y-4">
      <PageHeader
        title="竞品参考拆解"
        description="粘一个竞品页面 URL → AI 反推策略 + 按你品牌指南写更好版本"
      />

      <Card className="bg-gradient-to-br from-primary/5 to-indigo-50 dark:to-indigo-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-indigo-500" />
            参考页 URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.competitor.com/landing" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input value={goal} onChange={(e) => setGoal(e.target.value)}
              placeholder="目标：landing page rewrite / product page / email copy..." />
            <Button size="lg" onClick={scrape} disabled={running}>
              {running
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />抓取 + 分析 + 重写...</>
                : <><Zap className="h-4 w-4 mr-2" />拆解并升级</>}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            ⚠️ 只适用于静态/SSR 页面；纯 SPA（React Router 等纯客户端渲染）抓不到有意义内容。
            不会执行 JavaScript，只读原始 HTML。
          </p>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                {result.title || result.source_url}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground mb-1">策略拆解</div>
                  <div className="rounded border p-2.5 space-y-1">
                    {s?.hero_hook && <div><strong>Hero：</strong>{s.hero_hook}</div>}
                    {s?.value_framing && <div><strong>框架：</strong>{s.value_framing}</div>}
                    {s?.social_proof_type && <div><strong>社会证明：</strong>{s.social_proof_type}</div>}
                    {s?.cta_strategy && <div><strong>CTA：</strong>{s.cta_strategy}</div>}
                    {s?.urgency_tactics && <div><strong>紧迫性：</strong>{s.urgency_tactics}</div>}
                  </div>
                </div>
                <div className="space-y-2">
                  {s?.what_works && s.what_works.length > 0 && (
                    <div>
                      <div className="text-[11px] font-medium text-green-700 dark:text-green-400 mb-1">✓ 对方做得好的</div>
                      <ul className="rounded border border-green-200 bg-green-50/50 dark:bg-green-950/10 p-2 space-y-0.5">
                        {s.what_works.map((x, i) => <li key={i}>· {x}</li>)}
                      </ul>
                    </div>
                  )}
                  {s?.what_to_beat && s.what_to_beat.length > 0 && (
                    <div>
                      <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400 mb-1">✗ 我们可以超越的</div>
                      <ul className="rounded border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 p-2 space-y-0.5">
                        {s.what_to_beat.map((x, i) => <li key={i}>· {x}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              {s?.rewrite_angle && (
                <div className="rounded border-2 border-dashed border-primary/30 bg-primary/5 p-2.5">
                  <div className="text-[11px] font-medium text-primary mb-0.5">战略方向</div>
                  <p className="text-sm font-medium">{s.rewrite_angle}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {result.rewritten_html && (
            <Card className="border-green-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    升级版（使用你的品牌指南重写）
                  </CardTitle>
                  {result.improvements && result.improvements.length > 0 && (
                    <Badge variant="outline" className="text-[9px]">{result.improvements.length} 项改进</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <HtmlPreview
                  html={result.rewritten_html}
                  title={result.title || "升级版"}
                  shopifyDeploy={{ target: "new_page", defaultTitle: `${result.title || "Rewrite"} · BrandMind` }}
                  deployLabel="创建 Shopify 页面"
                />
                {result.improvements && result.improvements.length > 0 && (
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground mb-1">改进清单</div>
                    <ul className="text-xs space-y-0.5">
                      {result.improvements.map((x, i) => (
                        <li key={i} className="flex gap-2"><span className="text-green-500">✓</span>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
