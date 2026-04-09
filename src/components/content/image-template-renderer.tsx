"use client";

import { useRef, useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

export interface TemplateData {
  headline: string;
  subheadline?: string;
  cta?: string;
  productImageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  brandName?: string;
  discount?: string;
  badge?: string;
}

export interface TemplateConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  category: string;
  render: (data: TemplateData) => React.ReactNode;
}

interface ImageTemplateRendererProps {
  template: TemplateConfig;
  data: TemplateData;
}

export function ImageTemplateRenderer({ template, data }: ImageTemplateRendererProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!ref.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(ref.current, {
        width: template.width,
        height: template.height,
        pixelRatio: 2,
        cacheBust: true,
      });
      // Download
      const link = document.createElement("a");
      link.download = `${template.id}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("导出失败:", err);
    }
    setExporting(false);
  }, [template]);

  // Scale for preview (fit in container)
  const maxPreviewWidth = 600;
  const scale = Math.min(maxPreviewWidth / template.width, 1);

  return (
    <div className="space-y-3">
      {/* Preview (scaled) */}
      <div className="overflow-hidden rounded-lg border bg-white" style={{ maxWidth: maxPreviewWidth }}>
        <div
          style={{
            width: template.width,
            height: template.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            ref={ref}
            style={{
              width: template.width,
              height: template.height,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {template.render(data)}
          </div>
        </div>
        {/* Adjust container height to match scaled content */}
        <div style={{ height: template.height * scale - template.height, marginTop: 0 }} />
      </div>

      {/* Export */}
      <Button onClick={handleExport} disabled={exporting} className="w-full">
        {exporting ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />导出中...</>
        ) : (
          <><Download className="mr-2 h-4 w-4" />导出 PNG ({template.width}x{template.height})</>
        )}
      </Button>
    </div>
  );
}
