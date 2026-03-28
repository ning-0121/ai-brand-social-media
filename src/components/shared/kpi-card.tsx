"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendDirection } from "@/lib/types";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

interface KPICardProps {
  label: string;
  value: string | number;
  trend: TrendDirection;
  trendPercent?: number;
  icon: string;
  format?: "number" | "currency" | "percent";
}

function getIcon(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (Icons as any)[name];
  return IconComponent || Icons.Activity;
}

export function KPICard({ label, value, trend, trendPercent, icon, format }: KPICardProps) {
  const Icon = getIcon(icon);
  const formattedValue =
    typeof value === "number"
      ? format === "currency"
        ? formatCurrency(value)
        : format === "percent"
          ? value + "%"
          : formatNumber(value)
      : value;

  return (
    <Card className="transition-shadow hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <div className="rounded-md bg-primary/10 p-1.5">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold tabular-nums">{formattedValue}</span>
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
