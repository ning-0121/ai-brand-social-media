"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Loader2, Save, Palette, Type, Mic, Users, Trophy, Sparkles, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Guide {
  brand_name: string;
  tagline: string | null;
  one_liner: string | null;
  mission: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  neutral_color: string;
  gradient_css: string | null;
  font_heading: string;
  font_body: string;
  logo_url: string | null;
  hero_image_url: string | null;
  tone_of_voice: string | null;
  vocabulary_yes: string[];
  vocabulary_no: string[];
  signature_phrases: string[];
  audience_primary: string | null;
  audience_persona: string | null;
  value_props: string[];
  differentiators: string[];
  reference_brands: string[];
  visual_dna: string | null;
  moodboard_urls: string[];
  visual_dna_generated_at: string | null;
}

function arrayToText(a: string[]): string { return (a || []).join("\n"); }
function textToArray(s: string): string[] { return s.split("\n").map(x => x.trim()).filter(Boolean); }

export default function BrandGuidePage() {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingDna, setGeneratingDna] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/brand-guide");
      const d = await res.json();
      setGuide(d.guide);
    } catch { toast.error("加载失败"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!guide) return;
    setSaving(true);
    try {
      const res = await fetch("/api/brand-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guide),
      });
      if (!res.ok) throw new Error("save failed");
      toast.success("品牌指南已保存 — 所有 prompt 下次运行自动生效");
      await load();
    } catch {
      toast.error("保存失败");
    }
    setSaving(false);
  };

  const generateDna = async () => {
    setGeneratingDna(true);
    try {
      const res = await fetch("/api/brand-guide/visual-dna", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "failed");
      toast.success(`Visual DNA 已生成 · ${d.moodboard_urls?.length || 0} 张 moodboard`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "生成失败");
    }
    setGeneratingDna(false);
  };

  if (loading) return <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  if (!guide) return (
    <div className="py-12 text-center text-muted-foreground">
      品牌指南未初始化。去 Supabase 跑 <code>add_brand_guide.sql</code>
    </div>
  );

  const update = (k: keyof Guide, v: unknown) => setGuide({ ...guide, [k]: v });

  return (
    <div className="space-y-4">
      <PageHeader
        title="品牌指南"
        description="所有 AI 生成内容（详情页、Banner、Landing、社媒）都会自动注入这里定义的色彩、字体、语气、价值主张 — 保证品牌一致性"
        actions={<Button onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />保存中</> : <><Save className="h-3.5 w-3.5 mr-1.5" />保存</>}
        </Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 基础 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" />品牌基础</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Field label="品牌名"><Input value={guide.brand_name} onChange={e => update("brand_name", e.target.value)} /></Field>
            <Field label="Tagline（slogan）"><Input value={guide.tagline || ""} onChange={e => update("tagline", e.target.value)} placeholder="Move like you mean it." /></Field>
            <Field label="一句话定位"><Input value={guide.one_liner || ""} onChange={e => update("one_liner", e.target.value)} placeholder="Premium athletic wear for women who train with intention" /></Field>
            <Field label="使命"><Textarea rows={2} value={guide.mission || ""} onChange={e => update("mission", e.target.value)} /></Field>
            <Field label="Logo URL"><Input value={guide.logo_url || ""} onChange={e => update("logo_url", e.target.value)} placeholder="https://..." /></Field>
          </CardContent>
        </Card>

        {/* 视觉系统 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Palette className="h-4 w-4 text-rose-500" />视觉系统</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <ColorField label="主色" value={guide.primary_color} onChange={v => update("primary_color", v)} />
              <ColorField label="辅色" value={guide.secondary_color} onChange={v => update("secondary_color", v)} />
              <ColorField label="强调色" value={guide.accent_color} onChange={v => update("accent_color", v)} />
              <ColorField label="中性色" value={guide.neutral_color} onChange={v => update("neutral_color", v)} />
            </div>
            <Field label="Gradient CSS（可选）"><Input value={guide.gradient_css || ""} onChange={e => update("gradient_css", e.target.value)} placeholder="linear-gradient(135deg, #667eea, #764ba2)" /></Field>
          </CardContent>
        </Card>

        {/* 字体 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Type className="h-4 w-4 text-blue-500" />字体</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Field label="标题字体栈"><Input value={guide.font_heading} onChange={e => update("font_heading", e.target.value)} className="font-mono text-[11px]" /></Field>
            <Field label="正文字体栈"><Input value={guide.font_body} onChange={e => update("font_body", e.target.value)} className="font-mono text-[11px]" /></Field>
            <div className="border rounded p-2 space-y-1 bg-muted/20">
              <div className="text-[10px] text-muted-foreground">预览</div>
              <div style={{ fontFamily: guide.font_heading, fontSize: 22, fontWeight: 700, color: guide.primary_color }}>{guide.brand_name}</div>
              <div style={{ fontFamily: guide.font_body, fontSize: 12, color: guide.neutral_color }}>{guide.tagline || "Your tagline here"}</div>
            </div>
          </CardContent>
        </Card>

        {/* 语气 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Mic className="h-4 w-4 text-purple-500" />语气与用词</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Field label="Tone of voice"><Textarea rows={2} value={guide.tone_of_voice || ""} onChange={e => update("tone_of_voice", e.target.value)} placeholder="Confident, minimalist, direct. No hype words. Short sentences." /></Field>
            <Field label="偏好词汇（每行一个）"><Textarea rows={3} value={arrayToText(guide.vocabulary_yes)} onChange={e => update("vocabulary_yes", textToArray(e.target.value))} className="font-mono text-[11px]" /></Field>
            <Field label="禁用词汇（每行一个）"><Textarea rows={3} value={arrayToText(guide.vocabulary_no)} onChange={e => update("vocabulary_no", textToArray(e.target.value))} placeholder={"premium\nbest-in-class\nworld-class"} className="font-mono text-[11px]" /></Field>
            <Field label="品牌口头禅（每行一个）"><Textarea rows={2} value={arrayToText(guide.signature_phrases)} onChange={e => update("signature_phrases", textToArray(e.target.value))} className="font-mono text-[11px]" /></Field>
          </CardContent>
        </Card>

        {/* 受众 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-cyan-500" />目标受众</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Field label="主要受众（一句话）"><Input value={guide.audience_primary || ""} onChange={e => update("audience_primary", e.target.value)} /></Field>
            <Field label="Persona 详细画像"><Textarea rows={4} value={guide.audience_persona || ""} onChange={e => update("audience_persona", e.target.value)} placeholder="Sarah, 28, marketing manager in NYC. Trains 4x/week. Pays $80+ for quality leggings. Hates fast fashion feel." /></Field>
          </CardContent>
        </Card>

        {/* 价值主张 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">核心价值 & 差异化</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Field label="价值主张（每行一个，3-5 条）"><Textarea rows={4} value={arrayToText(guide.value_props)} onChange={e => update("value_props", textToArray(e.target.value))} /></Field>
            <Field label="差异化点（每行一个）"><Textarea rows={3} value={arrayToText(guide.differentiators)} onChange={e => update("differentiators", textToArray(e.target.value))} /></Field>
            <Field label="对标品牌（每行一个）"><Textarea rows={2} value={arrayToText(guide.reference_brands)} onChange={e => update("reference_brands", textToArray(e.target.value))} placeholder={"Allbirds\nAway\nOatly"} /></Field>
          </CardContent>
        </Card>
      </div>

      {/* Visual DNA — AI Art Director */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/10 dark:to-pink-950/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Visual DNA（AI Art Director）
              <span className="text-[11px] text-muted-foreground font-normal">
                所有 AI 图片生成的视觉锚 — 保证跨 skill 视觉一致性
              </span>
            </CardTitle>
            <Button size="sm" variant="default" onClick={generateDna} disabled={generatingDna}>
              {generatingDna
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />生成中（约 1-2 分钟）...</>
                : <><Sparkles className="h-3.5 w-3.5 mr-1.5" />{guide.visual_dna ? "重新生成" : "生成 Visual DNA"}</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {guide.visual_dna ? (
            <>
              <div>
                <div className="text-[11px] font-medium text-muted-foreground mb-1">风格描述（已注入所有图片 prompt）</div>
                <div className="rounded border bg-background p-3 text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-auto">
                  {guide.visual_dna}
                </div>
                {guide.visual_dna_generated_at && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    生成于 {new Date(guide.visual_dna_generated_at).toLocaleString("zh-CN")}
                  </p>
                )}
              </div>
              {guide.moodboard_urls.length > 0 && (
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    Moodboard（视觉参考）
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {guide.moodboard_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="aspect-square rounded overflow-hidden border group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`moodboard-${i}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">
              点击右上角「生成 Visual DNA」— AI 会根据你填写的品牌信息生成一段 500 字视觉语言描述 + 4 张 moodboard 参考图。
              之后所有图片 skill（商品图、Banner、海报）都会自动参照这份 DNA，保证跨 skill 视觉一致。
            </p>
          )}
        </CardContent>
      </Card>

      {/* 色卡预览 */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">色卡预览</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Primary", v: guide.primary_color },
              { label: "Secondary", v: guide.secondary_color },
              { label: "Accent", v: guide.accent_color },
              { label: "Neutral", v: guide.neutral_color },
            ].map(c => (
              <div key={c.label} className="rounded-lg overflow-hidden border">
                <div style={{ background: c.v, height: 64 }} />
                <div className="p-2 bg-background">
                  <div className="text-[10px] text-muted-foreground">{c.label}</div>
                  <code className="text-[11px] font-mono">{c.v}</code>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-muted-foreground">{label}</label>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-1.5 mt-0.5">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="h-8 w-8 rounded border cursor-pointer" />
        <Input value={value} onChange={e => onChange(e.target.value)} className={cn("text-xs font-mono flex-1")} />
      </div>
    </div>
  );
}
