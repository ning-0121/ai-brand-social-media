"use client";

import { useEffect, useState, useRef } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase-browser";
const supabase = createClient();
import { cn } from "@/lib/utils";
import {
  Upload,
  Wand2,
  Trash2,
  Loader2,
  FolderOpen,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface MediaItem {
  id: string;
  filename: string;
  original_url: string;
  media_type: string;
  category: string | null;
  tags: string[];
  product_name: string | null;
  source: string;
  parent_id: string | null;
  ai_edit_prompt: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "all", label: "全部" },
  { value: "product", label: "商品图" },
  { value: "lifestyle", label: "场景图" },
  { value: "banner", label: "Banner" },
  { value: "social", label: "社媒素材" },
  { value: "campaign", label: "活动素材" },
  { value: "general", label: "其他" },
];

const EDIT_PRESETS = [
  { value: "remove_background", label: "去除背景" },
  { value: "white_background", label: "白色背景" },
  { value: "lifestyle_background", label: "生活场景背景" },
  { value: "brighten", label: "增加亮度" },
  { value: "warm_tone", label: "暖色调" },
  { value: "cool_tone", label: "冷色调" },
  { value: "crop_square", label: "裁剪为正方形" },
  { value: "crop_portrait", label: "裁剪为竖版 4:5" },
  { value: "crop_story", label: "裁剪为 9:16 Story" },
  { value: "enhance_detail", label: "增强细节" },
];

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchMedia(); }, [categoryFilter]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      const res = await fetch(`/api/media?${params}`);
      const data = await res.json();
      setMedia(data.media || []);
    } catch { toast.error("加载素材失败"); }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const path = `uploads/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("content-media").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (error) { toast.error("上传失败: " + error.message); continue; }

        const { data: { publicUrl } } = supabase.storage.from("content-media").getPublicUrl(path);

        await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register",
            filename: file.name,
            url: publicUrl,
            media_type: file.type.startsWith("video") ? "video" : "image",
            mime_type: file.type,
            file_size: file.size,
            category: "general",
          }),
        });
      } catch { toast.error("上传失败，请重试"); }
    }
    setUploading(false);
    fetchMedia();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAiEdit = async (preset?: string) => {
    if (!selectedMedia) return;
    const prompt = preset || editPrompt;
    if (!prompt.trim()) return;

    setEditing(true);
    try {
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ai_edit",
          media_id: selectedMedia.id,
          edit_prompt: prompt,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditPrompt("");
        fetchMedia();
      } else {
        alert(`修图失败: ${data.error}`);
      }
    } catch { toast.error("AI 修图失败，请重试"); }
    setEditing(false);
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (selectedMedia?.id === id) setSelectedMedia(null);
    fetchMedia();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="素材库"
        description="上传、管理、AI 修图 — 原图永不被覆盖"
        actions={
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleUpload} />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
              上传素材
            </Button>
          </div>
        }
      />

      {/* Category filter */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(cat.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors",
              categoryFilter === cat.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Media Grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : media.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">素材库为空</p>
                <p className="text-xs text-muted-foreground mt-1">上传图片或视频开始管理你的素材</p>
                <Button className="mt-4" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-1.5 h-4 w-4" /> 上传
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              {media.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "group relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                    selectedMedia?.id === item.id ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/20"
                  )}
                  onClick={() => setSelectedMedia(item)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.original_url} alt={item.filename} className="w-full h-full object-cover" />

                  {/* Source badge */}
                  {item.source === "ai_edited" && (
                    <div className="absolute top-1 left-1">
                      <Badge className="text-[9px] bg-purple-500/80">AI 修改</Badge>
                    </div>
                  )}
                  {item.source === "ai_generated" && (
                    <div className="absolute top-1 left-1">
                      <Badge className="text-[9px] bg-blue-500/80">AI 生成</Badge>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                    <div className="w-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-[10px] truncate">{item.filename}</p>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel: selected media + AI edit */}
        {selectedMedia && (
          <Card className="w-[340px] shrink-0 sticky top-6">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">素材详情</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMedia(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedMedia.original_url} alt={selectedMedia.filename} className="w-full rounded-lg" />

              {/* Info */}
              <div className="text-xs space-y-1 text-muted-foreground">
                <p>文件名: {selectedMedia.filename}</p>
                <p>来源: {selectedMedia.source === "upload" ? "手动上传" : selectedMedia.source === "ai_edited" ? "AI 修改" : "AI 生成"}</p>
                {selectedMedia.product_name && <p>关联商品: {selectedMedia.product_name}</p>}
                {selectedMedia.ai_edit_prompt && <p>修图指令: {selectedMedia.ai_edit_prompt}</p>}
              </div>

              {/* Tags */}
              {selectedMedia.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedMedia.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              )}

              {/* AI Edit Section */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-purple-500" />
                  <h4 className="text-sm font-semibold">AI 修图</h4>
                </div>
                <p className="text-[11px] text-muted-foreground">修改后另存为新文件，原图不变</p>

                {/* Presets */}
                <div className="flex flex-wrap gap-1">
                  {EDIT_PRESETS.map((preset) => (
                    <Button
                      key={preset.value}
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => handleAiEdit(preset.value)}
                      disabled={editing}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                {/* Custom edit */}
                <div className="flex gap-2">
                  <Input
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="自定义修图指令..."
                    className="text-xs h-8"
                  />
                  <Button size="sm" className="h-8 shrink-0" onClick={() => handleAiEdit()} disabled={editing || !editPrompt.trim()}>
                    {editing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
