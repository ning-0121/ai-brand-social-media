"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Code2,
  Eye,
  Smartphone,
  Monitor,
  ExternalLink,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface HtmlPreviewProps {
  html: string;
  title?: string;
  onSave?: (newHtml: string) => Promise<void>;
  /** Optional: show "deploy to Shopify" action */
  onDeploy?: () => Promise<void>;
  deployLabel?: string;
  /** Initial viewport: desktop or mobile */
  defaultViewport?: "desktop" | "mobile";
  /** If set, shows built-in "部署到 Shopify" button that POSTs to /api/shopify/deploy-html */
  shopifyDeploy?:
    | { target: "product_body"; productId: string; productName?: string }
    | { target: "new_page"; defaultTitle: string }
    | { target: "update_page"; pageId: number; title?: string };
}

/**
 * Rich HTML page preview with iframe + editable source + device toggle.
 * Used for product detail pages, landing pages, homepage hero, etc.
 */
export function HtmlPreview({
  html: initialHtml,
  title,
  onSave,
  onDeploy,
  deployLabel = "部署到 Shopify",
  defaultViewport = "desktop",
  shopifyDeploy,
}: HtmlPreviewProps) {
  const [html, setHtml] = useState(initialHtml);
  const [view, setView] = useState<"preview" | "source">("preview");
  const [viewport, setViewport] = useState<"desktop" | "mobile">(defaultViewport);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [dirty, setDirty] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { setHtml(initialHtml); setDirty(false); }, [initialHtml]);

  // Wrap bare fragment HTML so it renders with a full document shell
  const fullDocument = /<html[\s>]/i.test(html)
    ? html
    : `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#111}img{max-width:100%;height:auto;display:block}.container,main,article{max-width:1200px;margin:0 auto;padding:16px}</style></head><body>${html}</body></html>`;

  const copyHtml = async () => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    toast.success("HTML 已复制");
    setTimeout(() => setCopied(false), 1500);
  };

  const openInNewTab = () => {
    const blob = new Blob([fullDocument], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(html);
      setDirty(false);
      toast.success("已保存");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDeploy = async () => {
    // Built-in Shopify deploy path
    if (shopifyDeploy) {
      setDeploying(true);
      try {
        const body: Record<string, unknown> = { target: shopifyDeploy.target, html };
        if (shopifyDeploy.target === "product_body") {
          body.product_id = shopifyDeploy.productId;
        } else if (shopifyDeploy.target === "new_page") {
          const userTitle = prompt("页面标题：", shopifyDeploy.defaultTitle);
          if (!userTitle) { setDeploying(false); return; }
          body.title = userTitle;
        } else {
          body.page_id = shopifyDeploy.pageId;
          if (shopifyDeploy.title) body.title = shopifyDeploy.title;
        }

        const res = await fetch("/api/shopify/deploy-html", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "部署失败");
        toast.success(data.message || "Shopify 部署成功");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "部署失败");
      } finally {
        setDeploying(false);
      }
      return;
    }

    if (!onDeploy) return;
    setDeploying(true);
    try {
      await onDeploy();
      toast.success("部署成功");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "部署失败");
    } finally {
      setDeploying(false);
    }
  };

  const wrapper = fullscreen
    ? "fixed inset-0 z-50 bg-background flex flex-col"
    : "rounded-lg border bg-background overflow-hidden";

  return (
    <div className={wrapper}>
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 border-b bg-muted/30 px-2 py-1.5 flex-wrap">
        {title && (
          <Badge variant="outline" className="text-[10px] shrink-0">
            {title}
          </Badge>
        )}

        {/* View toggle */}
        <div className="flex rounded-md border bg-background p-0.5 ml-1">
          <button
            onClick={() => setView("preview")}
            className={cn(
              "px-2 py-0.5 text-[10px] rounded flex items-center gap-1",
              view === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="h-3 w-3" /> 预览
          </button>
          <button
            onClick={() => setView("source")}
            className={cn(
              "px-2 py-0.5 text-[10px] rounded flex items-center gap-1",
              view === "source" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Code2 className="h-3 w-3" /> 源码
          </button>
        </div>

        {/* Viewport toggle (only in preview mode) */}
        {view === "preview" && (
          <div className="flex rounded-md border bg-background p-0.5">
            <button
              onClick={() => setViewport("desktop")}
              className={cn(
                "px-1.5 py-0.5 rounded",
                viewport === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              <Monitor className="h-3 w-3" />
            </button>
            <button
              onClick={() => setViewport("mobile")}
              className={cn(
                "px-1.5 py-0.5 rounded",
                viewport === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              <Smartphone className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={copyHtml}>
            {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={openInNewTab}>
            <ExternalLink className="h-3 w-3" />
          </Button>
          {onSave && dirty && (
            <Button size="sm" className="h-6 px-2 text-[10px]" onClick={handleSave} disabled={saving}>
              <Save className="h-3 w-3 mr-1" />
              {saving ? "保存中..." : "保存"}
            </Button>
          )}
          {(onDeploy || shopifyDeploy) && (
            <Button size="sm" variant="default" className="h-6 px-2 text-[10px]" onClick={handleDeploy} disabled={deploying}>
              {deploying ? "部署中..." : deployLabel}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className={cn("flex-1 overflow-auto", fullscreen ? "min-h-0" : "")}>
        {view === "preview" ? (
          <div
            className={cn(
              "bg-neutral-100 dark:bg-neutral-900 flex items-start justify-center",
              fullscreen ? "h-full p-4" : "p-2"
            )}
          >
            <div
              className={cn(
                "bg-white shadow-sm transition-all",
                viewport === "mobile" ? "w-[390px]" : "w-full max-w-[1200px]"
              )}
              style={{ height: fullscreen ? "100%" : "480px" }}
            >
              <iframe
                ref={iframeRef}
                title={title || "preview"}
                srcDoc={fullDocument}
                sandbox="allow-same-origin"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        ) : (
          <textarea
            value={html}
            onChange={(e) => {
              setHtml(e.target.value);
              setDirty(true);
            }}
            className={cn(
              "w-full font-mono text-[11px] p-3 bg-neutral-950 text-neutral-100 resize-none focus:outline-none",
              fullscreen ? "h-full" : "h-[480px]"
            )}
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}
