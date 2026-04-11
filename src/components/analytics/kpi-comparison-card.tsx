"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface KPIData {
  this_week: { revenue: number; orders: number; aov: number; customers: number };
  last_week: { revenue: number; orders: number; aov: number; customers: number };
  changes: { revenue: number; orders: number; aov: number; customers: number };
}

export function KPIComparisonCard() {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics?type=kpi_comparison")
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error("加载 KPI 对比失败"))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return null;

  const metrics = [
    { label: "收入", current: `¥${data.this_week.revenue.toLocaleString()}`, prev: `¥${data.last_week.revenue.toLocaleString()}`, change: data.changes.revenue },
    { label: "订单", current: String(data.this_week.orders), prev: String(data.last_week.orders), change: data.changes.orders },
    { label: "客单价", current: `¥${data.this_week.aov}`, prev: `¥${data.last_week.aov}`, change: data.changes.aov },
    { label: "新客户", current: String(data.this_week.customers), prev: String(data.last_week.customers), change: data.changes.customers },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">本周 vs 上周</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="space-y-1">
              <div className="text-xs text-muted-foreground">{m.label}</div>
              <div className="text-lg font-bold">{m.current}</div>
              <div className="flex items-center gap-1 text-xs">
                {m.change > 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : m.change < 0 ? (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                ) : (
                  <Minus className="h-3 w-3 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "font-medium",
                    m.change > 0 && "text-emerald-600",
                    m.change < 0 && "text-red-600",
                    m.change === 0 && "text-muted-foreground"
                  )}
                >
                  {m.change > 0 ? "+" : ""}{m.change}%
                </span>
                <span className="text-muted-foreground/60">vs {m.prev}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
