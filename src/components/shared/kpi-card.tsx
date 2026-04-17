"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendDirection } from "@/lib/types";
import { ArrowUpRight, ArrowDownRight, Minus, Info } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface KPICardProps {
  label: string;
  value: string | number;
  trend: TrendDirection;
  trendPercent?: number;
  icon: string;
  format?: "number" | "currency" | "percent";
  source?: "shopify_live" | "our_estimate" | "needs_ga4" | "all_accounts";
  sourceNote?: string;
}

const SOURCE_LABELS: Record<string, { label: string; tooltip: string; color: string }> = {
  shopify_live: {
    label: "Shopify 实时",
    tooltip: "数据直接来自 Shopify API，每次同步更新，真实可信",
    color: "text-green-600",
  },
  our_estimate: {
    label: "我们估算",
    tooltip: "系统基于公开数据自行计算（如 SEO 分 = 标题长度+Meta 完整度+内容质量），不是 Google 实际排名",
    color: "text-amber-600",
  },
  needs_ga4: {
    label: "需接 GA4",
    tooltip: "此数据需要 Google Analytics 4 集成，暂未配置",
    color: "text-gray-500",
  },
  all_accounts: {
    label: "全部账号",
    tooltip: "Shopify 所有客户账号（包括注册未下单、订阅邮件、弃购等），不只是付费客户",
    color: "text-amber-600",
  },
};

function getIcon(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (Icons as any)[name];
  return IconComponent || Icons.Activity;
}

export function KPICard({ label, value, trend, trendPercent, icon, format, source, sourceNote }: KPICardProps) {
  const Icon = getIcon(icon);
  const formattedValue =
    typeof value === "number"
      ? format === "currency"
        ? formatCurrency(value)
        : format === "percent"
          ? value + "%"
          : formatNumber(value)
      : value;

  const sourceConfig = source ? SOURCE_LABELS[source] : null;

  return (
    <Card className="transition-shadow hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            {label}
            {sourceConfig && (
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <div className={cn("text-xs font-medium", sourceConfig.color)}>
                      📊 数据来源：{sourceConfig.label}
                    </div>
                    <div className="text-[11px]">{sourceConfig.tooltip}</div>
                    {sourceNote && <div className="text-[11px] text-muted-foreground">{sourceNote}</div>}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </span>
          <div className="rounded-md bg-primary/10 p-1.5">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold tabular-nums">{formattedValue}</span>
          {sourceConfig && (
            <span className={cn("ml-2 text-[10px]", sourceConfig.color)}>{sourceConfig.label}</span>
          )}
        </div>
        {trendPercent !== undefined && (
          <div className="mt-1 flex items-center gap-1">
            {trend === "up" && (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
            )}
            {trend === "down" && (
              <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
            )}
            {trend === "flat" && (
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                trend === "up" && "text-emerald-500",
                trend === "down" && "text-destructive",
                trend === "flat" && "text-muted-foreground"
              )}
            >
              {formatPercent(trendPercent)}
            </span>
            <span className="text-xs text-muted-foreground">vs 上月</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KPICardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}
