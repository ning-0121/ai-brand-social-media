"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Palette } from "lucide-react";

interface BrandProfile {
  id?: string;
  brand_name: string;
  voice_style: string;
  visual_style: string;
  target_audience: string;
  key_categories: string[];
  preferred_platforms: string[];
  primary_colors: string[];
  secondary_colors: string[];
  typography_notes: string;
  banned_words: string[];
  core_value_props: string[];
  pricing_position: string;
}

const EMPTY_PROFILE: BrandProfile = {
  brand_name: "",
  voice_style: "",
  visual_style: "",
  target_audience: "",
  key_categories: [],
  preferred_platforms: [],
  primary_colors: [],
  secondary_colors: [],
  typography_notes: "",
  banned_words: [],
  core_value_props: [],
  pricing_position: "",
};

export function BrandProfileEditor() {
  const [profile, setProfile] = useState<BrandProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/brand-profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) setProfile({ ...EMPTY_PROFILE, ...data.profile });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/brand-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile({ ...EMPTY_PROFILE, ...data.profile });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("保存失败:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof BrandProfile, value: unknown) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const updateArrayField = (key: keyof BrandProfile, value: string) => {
    const arr = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    updateField(key, arr);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">品牌画像</h3>
          {profile.id && (
            <Badge variant="outline" className="text-xs">已创建</Badge>
          )}
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving || !profile.brand_name}>
          {saving ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-3.5 w-3.5" />
          )}
          {saved ? "已保存" : "保存"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 基本信息 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="品牌名称 *" value={profile.brand_name} onChange={(v) => updateField("brand_name", v)} placeholder="例: BrandMind" />
            <Field label="品牌调性" value={profile.voice_style} onChange={(v) => updateField("voice_style", v)} placeholder="例: 专业、温暖、有力量" />
            <Field label="视觉风格" value={profile.visual_style} onChange={(v) => updateField("visual_style", v)} placeholder="例: 极简、暖色系" />
            <Field label="目标受众" value={profile.target_audience} onChange={(v) => updateField("target_audience", v)} placeholder="例: 25-40岁女性，注重健康" />
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">定价策略</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={profile.pricing_position}
                onChange={(e) => updateField("pricing_position", e.target.value)}
              >
                <option value="">选择定价策略</option>
                <option value="premium">高端 Premium</option>
                <option value="mid-range">中端 Mid-range</option>
                <option value="value">性价比 Value</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* 品牌资产 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">品牌资产</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ArrayField label="核心价值主张" value={profile.core_value_props} onChange={(v) => updateArrayField("core_value_props", v)} placeholder="逗号分隔，例: 可持续材料, 运动优先设计" />
            <ArrayField label="主要品类" value={profile.key_categories} onChange={(v) => updateArrayField("key_categories", v)} placeholder="逗号分隔，例: 运动服, 瑜伽, 跑步" />
            <ArrayField label="主要平台" value={profile.preferred_platforms} onChange={(v) => updateArrayField("preferred_platforms", v)} placeholder="逗号分隔，例: instagram, tiktok" />
            <ArrayField label="禁用词" value={profile.banned_words} onChange={(v) => updateArrayField("banned_words", v)} placeholder="逗号分隔，例: cheap, discount" />
            <ColorField label="主色调" value={profile.primary_colors} onChange={(v) => updateArrayField("primary_colors", v)} />
            <Field label="字体说明" value={profile.typography_notes || ""} onChange={(v) => updateField("typography_notes", v)} placeholder="例: 标题用 Inter，正文用系统无衬线" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="text-sm" />
    </div>
  );
}

function ArrayField({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Textarea
        value={(value || []).join(", ")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-sm min-h-[60px]"
      />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <Input
          value={(value || []).join(", ")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="逗号分隔，例: #6366f1, #8b5cf6"
          className="text-sm flex-1"
        />
        <div className="flex gap-1">
          {(value || []).slice(0, 3).map((c, i) => (
            <div key={i} className="h-6 w-6 rounded border" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}
