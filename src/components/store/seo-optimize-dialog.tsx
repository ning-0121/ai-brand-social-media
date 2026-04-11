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
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Send, Zap } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  body_html?: string;
  meta_title?: string;
  meta_description?: string;
  tags?: string;
  shopify_product_id?: number;
}

interface SEOOptimizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  integrationId: string | null;
  onSubmitted: () => void;
}

export function SEOOptimizeDialog({
  open,
  onOpenChange,
  product,
  integrationId,
  onSubmitted,
}: SEOOptimizeDialogProps) {
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [newValues, setNewValues] = useState<Record<string, string> | null>(
    null
  );

  const handleGenerate = async () => {
    if (!product) return;
    setGenerating(true);
    setNewValues(null);

    try {
      const topic = [
        `商品名称: ${product.name}`,
        product.body_html ? `当前描述: ${product.body_html}` : "",
        product.meta_title ? `当前 SEO 标题: ${product.meta_title}` : "",
        product.meta_description
          ? `当前 SEO 描述: ${product.meta_description}`
          : "",
        product.tags ? `当前标签: ${product.tags}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: "seo_apply", topic }),
      });
      const data = await res.json();
      const result = data.results?.[0] || data.results;

      if (result && typeof result === "object") {
        setNewValues({
          title: result.title || product.name,
          body_html: result.body_html || product.body_html || "",
          meta_title: result.meta_title || "",
          meta_description: result.meta_description || "",
          tags: result.tags || product.tags || "",
        });
      }
    } catch {
      toast.error("AI SEO 生成失败，请重试");
    }
    setGenerating(false);
  };

  const handleSubmitForApproval = async () => {
    if (!product || !newValues) return;
    setSubmitting(true);

    try {
      const oldValues: Record<string, string> = {
        title: product.name,
        body_html: product.body_html || "",
        meta_title: product.meta_title || "",
        meta_description: product.meta_description || "",
        tags: product.tags || "",
      };

      const res = await fetch("/api/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          task: {
            type: "seo_update",
            entity_id: product.id,
            entity_type: "products",
            title: `SEO 优化: ${product.name}`,
            description:
              "AI 生成的 SEO 优化方案，包含标题、描述、Meta 标签和关键词优化",
            payload: {
              old_values: oldValues,
              new_values: newValues,
              shopify_product_id: product.shopify_product_id || null,
              integration_id: integrationId,
            },
            created_by: "ai",
          },
        }),
      });

      if (res.ok) {
        onOpenChange(false);
        setNewValues(null);
        onSubmitted();
      }
    } catch {
      toast.error("提交审批失败，请重试");
    }
    setSubmitting(false);
  };

  const handleQuickApply = async () => {
    if (!product || !newValues || !integrationId || !product.shopify_product_id) return;
    setApplying(true);
    try {
      const res = await fetch("/api/store/seo-quick-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration_id: integrationId,
          shopify_product_id: product.shopify_product_id,
          product_id: product.id,
          new_values: newValues,
        }),
      });
      if (res.ok) {
        toast.success("SEO 已更新到 Shopify");
        onOpenChange(false);
        setNewValues(null);
        onSubmitted();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "SEO 更新失败");
      }
    } catch {
      toast.error("网络错误，SEO 更新失败");
    }
    setApplying(false);
  };

  const canQuickApply = !!integrationId && !!product?.shopify_product_id;

  const handleFieldChange = (field: string, value: string) => {
    if (!newValues) return;
    setNewValues({ ...newValues, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            AI SEO 优化
          </DialogTitle>
          <DialogDescription>
            {product
              ? `为「${product.name}」生成 SEO 优化方案`
              : "选择商品后生成优化方案"}
          </DialogDescription>
        </DialogHeader>

        {!newValues ? (
          <div className="flex flex-col items-center py-8 gap-4">
            <p className="text-sm text-muted-foreground text-center">
              点击下方按钮，AI 将分析当前商品信息并生成优化后的 SEO
              文案
            </p>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              {generating ? "AI 正在分析..." : "开始 AI 优化"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm font-medium text-muted-foreground">
              修改对比（可编辑右侧内容）
            </div>

            {/* Editable fields */}
            {[
              { key: "title", label: "商品标题" },
              { key: "meta_title", label: "SEO 标题" },
              { key: "meta_description", label: "SEO 描述" },
              { key: "tags", label: "标签" },
            ].map(({ key, label }) => (
              <div
                key={key}
                className="rounded-lg border border-border overflow-hidden"
              >
                <div className="px-3 py-1.5 bg-muted text-xs font-medium text-muted-foreground">
                  {label}
                </div>
                <div className="grid grid-cols-2 divide-x divide-border">
                  <div className="p-3">
                    <div className="text-[10px] font-medium text-muted-foreground/60 mb-1">
                      当前
                    </div>
                    <div className="text-sm text-muted-foreground break-words">
                      {key === "title"
                        ? product?.name || "（空）"
                        : product?.[key as keyof Product]
                          ? String(product[key as keyof Product])
                          : "（空）"}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] font-medium text-muted-foreground/60 mb-1">
                      优化后
                    </div>
                    <Input
                      value={newValues[key] || ""}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      className="text-sm h-auto py-1 border-emerald-200 focus-visible:ring-emerald-500/30"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Body HTML - textarea */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-1.5 bg-muted text-xs font-medium text-muted-foreground">
                商品描述
              </div>
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="p-3">
                  <div className="text-[10px] font-medium text-muted-foreground/60 mb-1">
                    当前
                  </div>
                  <div className="text-sm text-muted-foreground break-words max-h-32 overflow-y-auto">
                    {product?.body_html || "（空）"}
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-[10px] font-medium text-muted-foreground/60 mb-1">
                    优化后
                  </div>
                  <textarea
                    value={newValues.body_html || ""}
                    onChange={(e) =>
                      handleFieldChange("body_html", e.target.value)
                    }
                    className="w-full min-h-[80px] rounded-md border border-emerald-200 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 resize-y"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          {newValues && (
            <>
              <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                )}
                重新生成
              </Button>
              <Button
                variant="default"
                onClick={handleQuickApply}
                disabled={applying || !canQuickApply}
                title={canQuickApply ? "跳过审批，直接推送到 Shopify" : "请先连接 Shopify"}
              >
                {applying ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-1.5 h-4 w-4" />
                )}
                {applying ? "应用中..." : "快速应用"}
              </Button>
              <Button variant="outline" onClick={handleSubmitForApproval} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-4 w-4" />
                )}
                {submitting ? "提交中..." : "提交审批"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
