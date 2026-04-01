"use client";

import { cn } from "@/lib/utils";

interface DiffViewProps {
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  fieldLabels?: Record<string, string>;
}

const DEFAULT_LABELS: Record<string, string> = {
  title: "标题",
  name: "商品名称",
  body_html: "商品描述",
  meta_title: "SEO 标题",
  meta_description: "SEO 描述",
  tags: "标签",
  price: "价格",
  stock: "库存",
  quantity: "数量",
  category: "分类",
  product_type: "商品类型",
};

export function DiffView({ oldValues, newValues, fieldLabels }: DiffViewProps) {
  const labels = { ...DEFAULT_LABELS, ...fieldLabels };
  const allKeys = Array.from(
    new Set([...Object.keys(oldValues), ...Object.keys(newValues)])
  );

  return (
    <div className="space-y-3">
      {allKeys.map((key) => {
        const oldVal = oldValues[key];
        const newVal = newValues[key];
        if (oldVal === newVal) return null;

        const label = labels[key] || key;
        const isHtml = key === "body_html";

        return (
          <div key={key} className="rounded-lg border border-border overflow-hidden">
            <div className="px-3 py-1.5 bg-muted text-xs font-medium text-muted-foreground">
              {label}
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="p-3">
                <div className="text-[10px] font-medium text-muted-foreground/60 mb-1">
                  修改前
                </div>
                <div
                  className={cn(
                    "text-sm break-words",
                    oldVal ? "bg-red-500/5 rounded px-2 py-1 text-red-700 dark:text-red-400" : ""
                  )}
                >
                  {isHtml ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: String(oldVal || "（空）") }}
                    />
                  ) : (
                    String(oldVal ?? "（空）")
                  )}
                </div>
              </div>
              <div className="p-3">
                <div className="text-[10px] font-medium text-muted-foreground/60 mb-1">
                  修改后
                </div>
                <div
                  className={cn(
                    "text-sm break-words",
                    newVal ? "bg-emerald-500/5 rounded px-2 py-1 text-emerald-700 dark:text-emerald-400" : ""
                  )}
                >
                  {isHtml ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: String(newVal || "（空）") }}
                    />
                  ) : (
                    String(newVal ?? "（空）")
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
