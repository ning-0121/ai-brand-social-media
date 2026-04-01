"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { cn } from "@/lib/utils";

interface ContentPreviewProps {
  platform: string;
  title: string;
  body: string;
  imageUrl?: string;
  hashtags?: string[];
  cta?: string;
  className?: string;
}

export function ContentPreview({
  platform,
  title,
  body,
  imageUrl,
  hashtags = [],
  cta,
  className,
}: ContentPreviewProps) {
  // Xiaohongshu style
  if (platform === "xiaohongshu") {
    return (
      <Card className={cn("overflow-hidden max-w-sm", className)}>
        {imageUrl && (
          <div className="aspect-[3/4] bg-muted">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-3 space-y-2">
          <h3 className="font-semibold text-sm leading-snug">{title}</h3>
          <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
            {body}
          </p>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hashtags.map((tag, i) => (
                <span key={i} className="text-xs text-blue-500">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Instagram style
  if (platform === "instagram") {
    return (
      <Card className={cn("overflow-hidden max-w-sm", className)}>
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center">
            <div className="h-6 w-6 rounded-full bg-background flex items-center justify-center">
              <PlatformIcon platform="instagram" size="sm" />
            </div>
          </div>
          <span className="text-xs font-semibold">brand_account</span>
        </div>
        {imageUrl && (
          <div className="aspect-square bg-muted">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-3 space-y-1.5">
          <p className="text-xs leading-relaxed">
            <span className="font-semibold mr-1">brand_account</span>
            {body}
          </p>
          {hashtags.length > 0 && (
            <p className="text-xs text-blue-500">
              {hashtags.map((t) => `#${t}`).join(" ")}
            </p>
          )}
        </div>
      </Card>
    );
  }

  // TikTok style
  if (platform === "tiktok") {
    return (
      <Card
        className={cn(
          "overflow-hidden max-w-xs relative bg-black text-white",
          className
        )}
      >
        {imageUrl && (
          <div className="aspect-[9/16] bg-muted relative">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-12">
              <p className="text-xs font-medium text-white leading-relaxed">
                {body}
              </p>
              {hashtags.length > 0 && (
                <p className="text-[10px] text-white/70 mt-1">
                  {hashtags.map((t) => `#${t}`).join(" ")}
                </p>
              )}
            </div>
          </div>
        )}
        {!imageUrl && (
          <div className="p-4 space-y-2">
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground">{body}</p>
          </div>
        )}
      </Card>
    );
  }

  // Default / generic style
  return (
    <Card className={cn("overflow-hidden", className)}>
      {imageUrl && (
        <div className="aspect-video bg-muted">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={platform as import("@/lib/types").Platform} size="sm" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
          {body}
        </p>
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hashtags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
        {cta && (
          <div className="pt-1">
            <Badge className="text-xs">{cta}</Badge>
          </div>
        )}
      </div>
    </Card>
  );
}
