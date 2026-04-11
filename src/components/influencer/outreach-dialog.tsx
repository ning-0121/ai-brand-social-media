"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, Copy, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface OutreachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  influencer: { id: string; name: string; platform: string; category: string } | null;
  onStatusUpdate?: (id: string) => void;
}

interface OutreachVersion {
  style: string;
  subject: string;
  message: string;
  follow_up: string;
}

export function OutreachDialog({
  open,
  onOpenChange,
  influencer,
  onStatusUpdate,
}: OutreachDialogProps) {
  const [generating, setGenerating] = useState(false);
  const [versions, setVersions] = useState<OutreachVersion[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!influencer) return;
    setGenerating(true);
    setVersions([]);
    try {
      const topic = `达人信息：
- 名称: ${influencer.name}
- 平台: ${influencer.platform}
- 品类: ${influencer.category}

合作目标：品牌推广合作邀约，希望达人进行产品种草/测评内容创作。`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: "influencer_outreach", topic }),
      });
      const data = await res.json();
      const results = data.results;
      if (Array.isArray(results)) {
        setVersions(results as OutreachVersion[]);
      }
    } catch {
      toast.error("外联话术生成失败");
    }
    setGenerating(false);
  };

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleUse = (idx: number) => {
    const v = versions[idx];
    navigator.clipboard.writeText(`${v.subject}\n\n${v.message}`);
    onStatusUpdate?.(influencer?.id || "");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-blue-500" />
            AI 外联话术
          </DialogTitle>
          <DialogDescription>
            {influencer
              ? `为「${influencer.name}」生成品牌合作邀约话术`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {versions.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-4">
            <p className="text-sm text-muted-foreground text-center">
              AI 将根据达人特点和平台风格，生成 3 个不同风格的外联话术
            </p>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              {generating ? "生成中..." : "生成外联话术"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {versions.map((v, idx) => (
              <Card key={idx}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {v.style}
                    </Badge>
                    <div className="flex gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          handleCopy(idx, `${v.subject}\n\n${v.message}`)
                        }
                      >
                        {copiedIdx === idx ? (
                          <Check className="mr-1 h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="mr-1 h-3 w-3" />
                        )}
                        {copiedIdx === idx ? "已复制" : "复制"}
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleUse(idx)}
                      >
                        使用并标记联系
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      标题
                    </div>
                    <p className="text-sm font-medium">{v.subject}</p>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      正文
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                      {v.message}
                    </p>
                  </div>
                  <div className="border-t border-border pt-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      跟进话术（3天后）
                    </div>
                    <p className="text-xs text-muted-foreground/80 whitespace-pre-line leading-relaxed">
                      {v.follow_up}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          {versions.length > 0 && (
            <Button variant="outline" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              )}
              重新生成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
