"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone, Code, Copy, Check } from "lucide-react";

interface HtmlPreviewProps {
  html: string;
  onHtmlChange?: (html: string) => void;
  className?: string;
}

export function HtmlPreview({ html, onHtmlChange, className }: HtmlPreviewProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b bg-muted/30 px-2 py-1.5">
        <Button
          variant={device === "desktop" && !showSource ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2"
          onClick={() => { setDevice("desktop"); setShowSource(false); }}
        >
          <Monitor className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={device === "mobile" && !showSource ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2"
          onClick={() => { setDevice("mobile"); setShowSource(false); }}
        >
          <Smartphone className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={showSource ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2"
          onClick={() => setShowSource(!showSource)}
        >
          <Code className="h-3.5 w-3.5" />
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Content */}
      {showSource ? (
        <textarea
          value={html}
          onChange={(e) => onHtmlChange?.(e.target.value)}
          className="w-full min-h-[400px] p-3 text-xs font-mono bg-gray-950 text-gray-300 resize-y"
          readOnly={!onHtmlChange}
        />
      ) : (
        <div className={cn(
          "bg-white mx-auto transition-all",
          device === "mobile" ? "max-w-[375px]" : "max-w-full"
        )}>
          <iframe
            srcDoc={wrapHtml(html)}
            sandbox="allow-same-origin"
            className="w-full border-0"
            style={{ minHeight: 400 }}
            onLoad={(e) => {
              // Auto-resize iframe to content height
              const iframe = e.target as HTMLIFrameElement;
              try {
                const height = iframe.contentDocument?.body?.scrollHeight;
                if (height) iframe.style.height = `${Math.min(height + 20, 800)}px`;
              } catch { /* cross-origin fallback */ }
            }}
          />
        </div>
      )}
    </div>
  );
}

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6; }
  img { max-width: 100%; height: auto; }
  table { width: 100%; }
</style>
</head>
<body>${body}</body>
</html>`;
}
