"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ImagePlus, Loader2, RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GeneratedImage {
  url: string;
  prompt: string;
}

interface ImageGeneratorProps {
  initialPrompt?: string;
  platform?: string;
  onImageSelected: (image: GeneratedImage) => void;
  selectedUrl?: string;
}

const STYLES = [
  { value: "product_photo", label: "商品图" },
  { value: "lifestyle", label: "生活场景" },
  { value: "flat_lay", label: "平铺摆拍" },
  { value: "social_media", label: "社媒风格" },
];

const SIZES = [
  { value: "1:1", label: "正方形 1:1" },
  { value: "16:9", label: "横版 16:9" },
  { value: "9:16", label: "竖版 9:16" },
  { value: "4:3", label: "横版 4:3" },
  { value: "3:4", label: "竖版 3:4" },
];

export function ImageGenerator({
  initialPrompt = "",
  platform,
  onImageSelected,
  selectedUrl,
}: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [style, setStyle] = useState(
    platform === "amazon" || platform === "shopify"
      ? "product_photo"
      : "social_media"
  );
  const [size, setSize] = useState(() => {
    if (platform === "tiktok") return "9:16";
    if (platform === "xiaohongshu") return "3:4";
    if (platform === "instagram") return "1:1";
    return "1:1";
  });
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setImages([]);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, size, quantity: 2 }),
      });
      const data = await res.json();
      if (data.images) {
        setImages(data.images);
        if (data.images.length > 0) {
          onImageSelected(data.images[0]);
        }
      }
    } catch {
      toast.error("图片生成失败");
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          图片描述 Prompt
        </label>
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想要生成的图片内容..."
          className="text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Select value={style} onValueChange={(v) => v && setStyle(v)}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STYLES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={size} onValueChange={(v) => v && setSize(v)}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SIZES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          className="h-8"
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
        >
          {generating ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : images.length > 0 ? (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
          )}
          {generating ? "生成中..." : images.length > 0 ? "重新生成" : "生成图片"}
        </Button>
      </div>

      {/* Generated images grid */}
      {generating && (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      )}

      {!generating && images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((img, idx) => (
            <Card
              key={idx}
              className={cn(
                "relative overflow-hidden cursor-pointer border-2 transition-colors",
                selectedUrl === img.url
                  ? "border-primary"
                  : "border-transparent hover:border-primary/30"
              )}
              onClick={() => onImageSelected(img)}
            >
              <img
                src={img.url}
                alt={`Generated ${idx + 1}`}
                className="w-full aspect-square object-cover"
              />
              {selectedUrl === img.url && (
                <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
