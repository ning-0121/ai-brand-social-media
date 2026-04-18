"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Code2, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Generate a Shopify-theme-ready tracking snippet for an A/B variant.
 * User pastes this into theme.liquid; it auto-50/50 splits traffic and reports view + conversion.
 */
export function TrackingSnippet({ variantId, appUrl }: { variantId: string; appUrl?: string }) {
  const [copied, setCopied] = useState(false);
  const [installing, setInstalling] = useState(false);
  const base = appUrl || (typeof window !== "undefined" ? window.location.origin : "https://brandmind-ai-eight.vercel.app");

  const autoInstall = async () => {
    setInstalling(true);
    try {
      const res = await fetch("/api/shopify/install-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant_id: variantId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "install failed");
      toast.success(
        d.already_installed
          ? `snippet 已存在于主题 "${d.theme_name}"（已激活）`
          : `自动安装到主题 "${d.theme_name}" 成功`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "自动安装失败");
    }
    setInstalling(false);
  };

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

  // 注入到 Shopify 购物车，订单 webhook 会读这两个属性把转化算回对应 variant
  function writeCartAttributes() {
    try {
      fetch("/cart/update.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attributes: {
            bm_variant_id: VID,
            bm_variant_which: which,
          },
        }),
      }).catch(function(){});
    } catch(e) {}
  }

  // Fire conversion when user clicks anything with [data-bm-convert] or reaches /checkout
  document.addEventListener("click", function(e) {
    var t = e.target && e.target.closest && e.target.closest("[data-bm-convert]");
    if (t) { writeCartAttributes(); report("conversion"); }
    // 也追加到 "Add to cart" 按钮
    var addBtn = e.target && e.target.closest && e.target.closest("[name=add],button[type=submit][form*=cart]");
    if (addBtn) writeCartAttributes();
  });
  if (/\\/(checkout|thank)/.test(location.pathname)) { writeCartAttributes(); report("conversion"); }
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
        <div className="flex items-center gap-1">
          <Button size="sm" variant="default" className="h-6 px-2 text-[10px]" onClick={autoInstall} disabled={installing}>
            {installing
              ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />安装中</>
              : <><Zap className="h-3 w-3 mr-1" />一键装到 Shopify</>}
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={copy}>
            {copied ? <><Check className="h-3 w-3 mr-1 text-green-600" />已复制</> : <><Copy className="h-3 w-3 mr-1" />复制</>}
          </Button>
        </div>
      </div>
      <pre className="p-2.5 text-[10px] font-mono bg-neutral-950 text-neutral-100 max-h-64 overflow-auto leading-snug">{snippet}</pre>
      <div className="p-2 text-[10px] text-muted-foreground border-t bg-background space-y-1">
        <p><strong>使用方法：</strong></p>
        <p>1. 把上面代码粘贴到 Shopify 主题的 <code className="font-mono">theme.liquid</code> 的 <code className="font-mono">&lt;/body&gt;</code> 之前</p>
        <p>2. 用户 Add to Cart 时自动写 <code className="font-mono">note_attributes</code>（无需加 data 属性）</p>
        <p>3. 在 Shopify Admin 配 Order Created webhook 到 <code className="font-mono">/api/webhooks/shopify/orders</code> → 订单转化自动回传</p>
        <p>4. 两边各 100 views + 转化差 30% 自动宣布 winner，商业分写回 <code className="font-mono">prompt_runs.score</code> → 督察晋升冠军 prompt</p>
      </div>
    </div>
  );
}
