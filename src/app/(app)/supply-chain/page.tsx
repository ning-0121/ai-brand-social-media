"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/hooks/use-store";
import {
  Truck,
  Package,
  AlertTriangle,
  Plus,
  Calculator,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";

const DEMO_INVENTORY = [
  { sku: "GLOVE-CTR-L", name: "Cut Resistant Gloves L", fba: 340, inbound: 200, velocity: 18, days: 19, status: "warning" },
  { sku: "GLOVE-CTR-M", name: "Cut Resistant Gloves M", fba: 820, inbound: 0,   velocity: 24, days: 34, status: "ok" },
  { sku: "GLOVE-CTR-XL", name: "Cut Resistant Gloves XL", fba: 80, inbound: 0,  velocity: 12, days: 7,  status: "critical" },
  { sku: "GLOVE-IMP-L",  name: "Impact Gloves L",          fba: 450, inbound: 300, velocity: 15, days: 30, status: "ok" },
  { sku: "GLOVE-IMP-M",  name: "Impact Gloves M",          fba: 620, inbound: 0,  velocity: 20, days: 31, status: "ok" },
];

const DEMO_POS = [
  { po: "PO-2026-041", supplier: "广州安全手套厂", sku: "GLOVE-CTR-XL / L / M", qty: 3000, status: "in_production", eta: "2026-05-18", cost: "$4,200" },
  { po: "PO-2026-038", supplier: "广州安全手套厂", sku: "GLOVE-IMP-L / M", qty: 2000, status: "shipped", eta: "2026-05-03", cost: "$3,600" },
  { po: "PO-2026-035", supplier: "东莞防护用品厂", sku: "GLOVE-CTR-S", qty: 1500, status: "arrived", eta: "2026-04-20", cost: "$2,100" },
];

const PO_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:         { label: "草稿",   color: "bg-gray-100 text-gray-600",    icon: Clock },
  confirmed:     { label: "已确认", color: "bg-blue-100 text-blue-600",    icon: CheckCircle2 },
  in_production: { label: "生产中", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  shipped:       { label: "已发货", color: "bg-purple-100 text-purple-600", icon: Truck },
  arrived:       { label: "已到货", color: "bg-green-100 text-green-600",  icon: CheckCircle2 },
  cancelled:     { label: "已取消", color: "bg-red-100 text-red-600",      icon: XCircle },
};

export default function SupplyChainPage() {
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState<"inventory" | "po" | "suppliers">("inventory");

  const criticalCount = DEMO_INVENTORY.filter((i) => i.status === "critical").length;
  const warningCount  = DEMO_INVENTORY.filter((i) => i.status === "warning").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">供应链 & 采购</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentStore?.name || "—"} · 库存预警 · 采购单管理 · 供应商档案
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          新建采购单
        </Button>
      </div>

      {/* 库存警报 */}
      {(criticalCount > 0 || warningCount > 0) && (
        <div className="flex gap-3">
          {criticalCount > 0 && (
            <Card className="border-red-200 bg-red-50/50 flex-1">
              <CardContent className="flex items-center gap-3 py-3">
                <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">{criticalCount} 个 SKU 即将断货（≤7天）</p>
                  <p className="text-xs text-red-600">立刻补货，否则断货后 BSR 排名会大幅下滑</p>
                </div>
                <Button size="sm" variant="outline" className="ml-auto border-red-300 text-red-700 hover:bg-red-100 shrink-0">
                  一键补货
                </Button>
              </CardContent>
            </Card>
          )}
          {warningCount > 0 && (
            <Card className="border-orange-200 bg-orange-50/50 flex-1">
              <CardContent className="flex items-center gap-3 py-3">
                <Clock className="h-6 w-6 text-orange-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-700">{warningCount} 个 SKU 库存偏低（≤21天）</p>
                  <p className="text-xs text-orange-600">建议本周提交采购单，确保 30 天供应</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 概览 KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "FBA 在库总量", value: "2,310", sub: "5 个 SKU", icon: Package },
          { label: "在途入库", value: "500", sub: "预计 5月3日到港", icon: Truck },
          { label: "日均销量", value: "89", sub: "近 30 天均值", icon: BarChart3 },
          { label: "平均库龄", value: "26天", sub: "库存周转", icon: Clock },
        ].map(({ label, value, sub, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 border-b">
        {(["inventory", "po", "suppliers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "inventory" ? "库存监控" : tab === "po" ? "采购单" : "供应商"}
          </button>
        ))}
      </div>

      {/* 库存监控 */}
      {activeTab === "inventory" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["SKU / 品名", "FBA在库", "在途", "日均销量", "剩余天数", "补货建议"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEMO_INVENTORY.map((row) => (
                  <tr key={row.sku} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs">{row.sku}</p>
                      <p className="text-xs text-muted-foreground">{row.name}</p>
                    </td>
                    <td className="px-4 py-3 font-medium tabular-nums">{row.fba.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {row.inbound > 0 ? `+${row.inbound}` : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{row.velocity}/天</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold tabular-nums ${
                        row.days <= 7 ? "text-red-500" :
                        row.days <= 21 ? "text-orange-500" : "text-green-500"
                      }`}>
                        {row.days} 天
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.status === "critical" ? (
                        <Button size="sm" variant="destructive" className="h-7 text-xs">
                          紧急补货
                        </Button>
                      ) : row.status === "warning" ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-orange-300 text-orange-600">
                          建议补货
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          库存充足
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 采购单 */}
      {activeTab === "po" && (
        <div className="space-y-2">
          {DEMO_POS.map((po) => {
            const config = PO_STATUS_CONFIG[po.status];
            const Icon = config.icon;
            return (
              <Card key={po.po} className="hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-4 py-3 px-4">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium">{po.po}</span>
                      <Badge className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {po.supplier} · {po.sku} · {po.qty.toLocaleString()} 件
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{po.cost}</p>
                    <p className="text-xs text-muted-foreground">ETA {po.eta}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })}
          <Button variant="outline" className="w-full h-10 border-dashed text-muted-foreground">
            <Plus className="mr-2 h-4 w-4" />
            新建采购单
          </Button>
        </div>
      )}

      {/* 供应商 */}
      {activeTab === "suppliers" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { name: "广州安全手套厂", contact: "李总", wechat: "gz_safety_gloves", lead: "25天", moq: "500件/款", orders: 3, status: "active" },
            { name: "东莞防护用品厂", contact: "王经理", wechat: "dg_protection", lead: "30天", moq: "1000件/款", orders: 1, status: "active" },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">联系人：{s.contact} · WeChat: {s.wechat}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">合作中</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: "备货周期", value: s.lead },
                    { label: "最小起订", value: s.moq },
                    { label: "历史订单", value: `${s.orders} 单` },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className="text-xs font-medium mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1">查看记录</Button>
                  <Button size="sm" className="h-7 text-xs flex-1">新建采购单</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-8">
              <Plus className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">添加供应商</p>
              <Button size="sm" variant="outline">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                新增供应商
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 补货计算器 */}
      <Card className="border-dashed bg-muted/20">
        <CardContent className="flex items-center gap-4 py-4">
          <Calculator className="h-8 w-8 text-muted-foreground/60 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">AI 补货计算器</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              输入销售速度 + 备货周期 + 目标安全库存天数，AI 自动计算补货量、预计花费和最佳下单时间
            </p>
          </div>
          <Button size="sm">
            <Calculator className="mr-1.5 h-3.5 w-3.5" />
            打开计算器
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
