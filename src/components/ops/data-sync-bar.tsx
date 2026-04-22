"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertTriangle, Loader2, Store, ShoppingCart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SyncStatus {
  connected: boolean;
  integration_id?: string;
  store_name?: string;
  store_url?: string;
  last_synced_at?: string;
  total_products?: number;
  total_orders?: number;
  last_sync_result?: string;
  last_order_sync_at?: string;
}

function formatTime(dateStr?: string) {
  if (!dateStr) return "从未同步";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export function DataSyncBar({ className }: { className?: string }) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/shopify");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSync = async () => {
    if (!status?.integration_id) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_all", integration_id: status.integration_id }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(`✅ 同步完成：${data.synced_products || 0} 商品，${data.synced_orders || 0} 订单`);
        await fetchStatus();
        // Trigger page refresh after 1s so dashboard picks up new data
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSyncResult(`❌ 同步失败：${data.error || "未知错误"}`);
      }
    } catch {
      setSyncResult("❌ 网络错误，请重试");
    }
    setSyncing(false);
  };

  if (!status) return null;

  // Not connected
  if (!status.connected) {
    return (
      <div className={cn("flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3", className)}>
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">Shopify 未连接</p>
          <p className="text-xs text-amber-600">前往系统设置连接你的 Shopify 店铺</p>
        </div>
        <a href="/settings" className="shrink-0 text-xs font-medium text-amber-700 underline hover:no-underline">
          去连接 →
        </a>
      </div>
    );
  }

  const hasOrders = (status.total_orders || 0) > 0;
  const needsOrderSync = !hasOrders;

  return (
    <div className={cn(
      "rounded-lg border px-4 py-3",
      needsOrderSync
        ? "border-orange-200 bg-orange-50"
        : "border-green-200 bg-green-50",
      className
    )}>
      <div className="flex items-center gap-3">
        <Store className={cn("h-4 w-4 shrink-0", needsOrderSync ? "text-orange-500" : "text-green-500")} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">
              {status.store_name || status.store_url || "Shopify 店铺"}
            </p>

            {/* Product count */}
            {(status.total_products || 0) > 0 && (
              <span className="flex items-center gap-1 text-[10px] bg-white rounded-full px-2 py-0.5 border border-green-200 text-green-700">
                <Package className="h-2.5 w-2.5" />
                {status.total_products} 商品
              </span>
            )}

            {/* Order count / warning */}
            {hasOrders ? (
              <span className="flex items-center gap-1 text-[10px] bg-white rounded-full px-2 py-0.5 border border-green-200 text-green-700">
                <ShoppingCart className="h-2.5 w-2.5" />
                {status.total_orders} 订单
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] bg-orange-100 rounded-full px-2 py-0.5 border border-orange-200 text-orange-700">
                <AlertTriangle className="h-2.5 w-2.5" />
                订单未同步
              </span>
            )}

            <span className="text-[10px] text-muted-foreground">
              最后同步：{formatTime(status.last_synced_at)}
            </span>
          </div>

          {needsOrderSync && (
            <p className="text-xs text-orange-600 mt-0.5">
              ⚠️ 订单数据未同步，营收显示 $0。点击「同步数据」拉取历史订单（需要 read_orders 权限）
            </p>
          )}

          {syncResult && (
            <p className="text-xs mt-1 font-medium">{syncResult}</p>
          )}
        </div>

        <Button
          size="sm"
          variant={needsOrderSync ? "default" : "outline"}
          className={cn(
            "shrink-0 h-7 text-xs",
            needsOrderSync && "bg-orange-500 hover:bg-orange-600 text-white"
          )}
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing
            ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />同步中...</>
            : <><RefreshCw className="mr-1.5 h-3 w-3" />同步数据</>
          }
        </Button>
      </div>
    </div>
  );
}

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  useEffect(() => {
    fetch("/api/shopify").then(r => r.json()).then(setStatus).catch(() => {});
  }, []);
  return status;
}
