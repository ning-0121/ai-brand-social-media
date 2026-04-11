"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentPreview } from "@/components/content/content-preview";
import { ImageGenerator } from "@/components/content/image-generator";
import {
  Save,
  Send,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
interface ContentData {
  title: string;
  body: string;
  hashtags?: string[];
  image_prompt?: string;
  cta?: string;
  platform: string;
  content_type: string;
  tags: string[];
}

interface ContentEditorProps {
  content: ContentData;
  onClose: () => void;
  onSaved?: () => void;
}

const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "xiaohongshu", label: "小红书" },
  { value: "amazon", label: "Amazon" },
  { value: "shopify", label: "Shopify" },
  { value: "independent", label: "独立站" },
];

export function ContentEditor({ content: initial, onClose, onSaved }: ContentEditorProps) {
  const [title, setTitle] = useState(initial.title || "");
  const [body, setBody] = useState(initial.body || "");
  const [platform, setPlatform] = useState(initial.platform || "shopify");
  const [tags, setTags] = useState((initial.hashtags || initial.tags || []).join(", "));
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/content-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_draft",
          title,
          body,
          platform,
          content_type: initial.content_type || "image_post",
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          image_url: imageUrl,
        }),
      });
      if ((await res.json()).success) {
        setSuccess("已保存草稿");
        onSaved?.();
      }
    } catch {
      toast.error("保存失败");
    }
    setSaving(false);
  };

  const handleSubmitApproval = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/content-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_approval",
          title,
          body,
          platform,
          content_type: initial.content_type || "image_post",
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          image_url: imageUrl,
        }),
      });
      if ((await res.json()).success) {
        setSuccess("已提交审批");
        onSaved?.();
      }
    } catch {
      toast.error("提交失败");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">编辑内容</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {success}
        </div>
      )}

      {/* Preview */}
      <ContentPreview
        title={title}
        body={body}
        hashtags={tags.split(",").map((t) => t.trim()).filter(Boolean)}
        imageUrl={imageUrl}
        platform={platform}
      />

      {/* Edit fields */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Select value={platform} onValueChange={(v) => v && setPlatform(v)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground">标题</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 text-sm"
            placeholder="内容标题"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground">正文</label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1 text-sm min-h-[120px]"
            placeholder="内容正文..."
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground">标签 (逗号分隔)</label>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="mt-1 text-sm"
            placeholder="标签1, 标签2, 标签3"
          />
        </div>

        {/* Image Generator */}
        <ImageGenerator
          initialPrompt={initial.image_prompt || ""}
          platform={platform}
          onImageSelected={(img) => setImageUrl(img.url)}
          selectedUrl={imageUrl}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9"
          onClick={handleSaveDraft}
          disabled={saving || !title.trim()}
        >
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
          保存草稿
        </Button>
        <Button
          size="sm"
          className="flex-1 h-9"
          onClick={handleSubmitApproval}
          disabled={submitting || !title.trim()}
        >
          {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
          提交审批
        </Button>
      </div>
    </div>
  );
}
