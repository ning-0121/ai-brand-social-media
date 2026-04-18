"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Code2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Generate a Shopify-theme-ready tracking snippet for an A/B variant.
 * User pastes this into theme.liquid; it auto-50/50 splits traffic and reports view + conversion.
 */
export function TrackingSnippet({ variantId, appUrl }: { variantId: string; appUrl?: string }) {
  const [copied, setCopied] = useState(false);
  const base = appUrl || (typeof window !== "undefined" ? window.location.origin : "https://brandmind-ai-eight.vercel.app");

  const snippet = `<!-- BrandMind A/B Tracking — variant ${variantId.slice(0, 8)} -->
<script>
(function() {
  var VID = ${JSON.stringify(variantId)};
  var API = ${JSON.stringify(base)} + "/api/campaigns/track";

  // 50/50 split — sticky per visitor via localStorage
  var which = localStorage.getItem("bm_ab_" + VID);
  if (!which) {
    which = Math.random() < 0.5 ? "a" : "b";
    localStorage.setItem("bm_ab_" + VID, which);
  }
  window.__bm_variant = which;

  // Route to variant URL if you embed this on a "router" page
  // (Otherwise delete this block and put the snippet directly on each variant page.)
  var routeA = document.querySelector("[data-bm-variant=a]");
  var routeB = document.querySelector("[data-bm-variant=b]");
  if (routeA && routeB) {
    (which === "a" ? routeA : routeB).style.display = "block";
    (which === "a" ? routeB : routeA).style.display = "none";
  }

  function report(event) {
    try {
      navigator.sendBeacon
        ? navigator.sendBeacon(API, new Blob([JSON.stringify({variant_id: VID, which: which, event: event})], {type: "application/json"}))
        : fetch(API, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({variant_id: VID, which: which, event: event}), keepalive: true});
    } catch(e) {}
  }

  // Fire view once per session
  var viewKey = "bm_view_" + VID + "_" + which;
  if (!sessionStorage.getItem(viewKey)) {
    report("view");
    sessionStorage.setItem(viewKey, "1");
  }

  // Fire conversion when user clicks anything with [data-bm-convert] or reaches /checkout
  document.addEventListener("click", function(e) {
    var t = e.target && e.target.closest && e.target.closest("[data-bm-convert]");
    if (t) report("conversion");
  });
  if (/\\/(checkout|thank)/.test(location.pathname)) report("conversion");
})();
</script>`;

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("代码已复制");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border bg-muted/20 overflow-hidden">
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b bg-background">
        <div className="flex items-center gap-2">
          <Code2 className="h-3.5 w-3.5 text-purple-500" />
          <span className="text-xs font-medium">Shopify Theme 追踪代码</span>
          <Badge variant="outline" className="text-[9px]">variant {variantId.slice(0, 8)}</Badge>
        </div>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={copy}>
          {copied ? <><Check className="h-3 w-3 mr-1 text-green-600" />已复制</> : <><Copy className="h-3 w-3 mr-1" />复制</>}
        </Button>
      </div>
      <pre className="p-2.5 text-[10px] font-mono bg-neutral-950 text-neutral-100 max-h-64 overflow-auto leading-snug">{snippet}</pre>
      <div className="p-2 text-[10px] text-muted-foreground border-t bg-background space-y-1">
        <p><strong>使用方法：</strong></p>
        <p>1. 把上面代码粘贴到 Shopify 主题的 <code className="font-mono">theme.liquid</code> 的 <code className="font-mono">&lt;/body&gt;</code> 之前</p>
        <p>2. 给 CTA 按钮/链接加属性 <code className="font-mono">data-bm-convert</code> 追踪转化点击</p>
        <p>3. 访问 /checkout 或 /thank-you 会自动上报转化</p>
        <p>4. 两边各 100 views + 转化差 30% 自动宣布 winner，商业分写回 <code className="font-mono">prompt_runs.score</code></p>
      </div>
    </div>
  );
}
