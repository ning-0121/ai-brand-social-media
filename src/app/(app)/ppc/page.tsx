"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/hooks/use-store";
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Target,
  Zap,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

function MetricCard({
  label, value, sub, trend, trendUp,
}: {
  label: string; value: string; sub?: string; trend?: string; trendUp?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trendUp ? "text-green-500" : "text-red-500"}`}>
            {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const AI_SUGGESTIONS = [
  {
    type: "reduce",
    keyword: "safety gloves bulk",
    current_bid: "$1.84",
    suggested_bid: "$1.20",
    reason: "ACoS 68% 远超目标 25%，过去 30 天无转化",
    impact: "high",
  },
  {
    type: "increase",
    keyword: "construction work gloves",
    current_bid: "$0.90",
    suggested_bid: "$1.35",
    reason: "转化率 8.2%，ACoS 仅 12%，预算不够用，错失大量曝光",
    impact: "high",
  },
  {
    type: "negative",
    keyword: "rubber gloves kitchen",
    current_bid: "$0.65",
    suggested_bid: "—",
    reason: "210 次点击 0 转化，消费 $136，与施工手套完全不相关",
    impact: "medium",
  },
  {
    type: "add",
    keyword: "heavy duty work gloves cut resistant",
    current_bid: "—",
    suggested_bid: "$1.10",
    reason: "竞品关键词，月搜索量约 8400，我方还未覆盖",
    impact: "medium",
  },
];

export default function PPCPage() {
  const { currentStore } = useStore();
  const [connected] = useState(false);

  const isAmazon = currentStore?.platform === "amazon";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">PPC 广告管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentStore?.name || "—"} · AI 广告优化 + 关键词分析
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            导入报告
          </Button>
          <Button size="sm">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            同步数据
          </Button>
        </div>
      </div>

      {/* 未连接提示 */}
      {!connected && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-8 w-8 text-orange-500 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-orange-700">尚未连接广告账户</p>
              <p className="text-sm text-orange-600 mt-0.5">
                {isAmazon
                  ? "请连接 Amazon Seller Central SP-API，或上传广告搜索词报告 (CSV) 进行 AI 分析"
                  : "请在系统设置中连接广告平台（Amazon / Google Ads / Meta）"}
              </p>
            </div>
            <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100 shrink-0">
              {isAmazon ? "连接 SP-API" : "去设置"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI 概览（演示数据） */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="30天广告花费" value="$12,840" sub="本月" trend="+8% vs 上月" trendUp={false} />
        <MetricCard label="广告销售额" value="$48,200" sub="本月" trend="+22% vs 上月" trendUp />
        <MetricCard label="ACoS" value="26.6%" sub="目标 ≤25%" trend="-2.1% vs 上月" trendUp />
        <MetricCard label="TACOS" value="11.4%" sub="总体广告效率" trend="+0.3% vs 上月" trendUp={false} />
      </div>

      {/* AI 优化建议 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <CardTitle className="text-sm font-medium">AI 优化建议</CardTitle>
            </div>
            <Badge variant="secondary">4 条待处理</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {AI_SUGGESTIONS.map((s, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                s.type === "reduce" ? "bg-orange-500" :
                s.type === "increase" ? "bg-green-500" :
                s.type === "negative" ? "bg-red-500" : "bg-blue-500"
              }`}>
                {s.type === "reduce" ? <TrendingDown className="h-3 w-3" /> :
                 s.type === "increase" ? <TrendingUp className="h-3 w-3" /> :
                 s.type === "negative" ? "✕" : "+"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono font-medium">"{s.keyword}"</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {s.type === "reduce" ? "降价" :
                     s.type === "increase" ? "提价" :
                     s.type === "negative" ? "否定" : "新增"}
                  </Badge>
                  {s.impact === "high" && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-600 hover:bg-red-100">高优先</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
                {s.suggested_bid !== "—" && (
                  <p className="text-xs mt-1">
                    <span className="text-muted-foreground">当前: </span>
                    <span className="font-medium">{s.current_bid}</span>
                    <span className="text-muted-foreground mx-1.5">→</span>
                    <span className="font-medium text-primary">{s.suggested_bid}</span>
                  </p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs">忽略</Button>
                <Button size="sm" className="h-7 text-xs">执行</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 广告系列列表（占位） */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              广告系列
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Target className="mr-1 h-3 w-3" />
              新建活动
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["广告活动", "类型", "状态", "花费", "销售额", "ACoS", "ROAS"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "SP - Construction Gloves", type: "Sponsored Products", status: "active", spend: "$4,200", sales: "$18,400", acos: "22.8%", roas: "4.4x" },
                  { name: "SB - Brand Defense", type: "Sponsored Brands", status: "active", spend: "$1,840", sales: "$9,200", acos: "20.0%", roas: "5.0x" },
                  { name: "SD - Retargeting", type: "Sponsored Display", status: "paused", spend: "$680", sales: "$1,800", acos: "37.8%", roas: "2.6x" },
                ].map((row, i) => (
                  <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-medium">{row.name}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.type}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={row.status === "active" ? "default" : "secondary"} className="text-[10px]">
                        {row.status === "active" ? "投放中" : "已暂停"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono">{row.spend}</td>
                    <td className="px-3 py-2.5 font-mono text-green-600">{row.sales}</td>
                    <td className="px-3 py-2.5 font-mono">
                      <span className={parseFloat(row.acos) > 25 ? "text-red-500" : "text-green-500"}>
                        {row.acos}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono">{row.roas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            演示数据 — 连接 SP-API 或导入搜索词报告后显示真实数据
          </p>
        </CardContent>
      </Card>

      {/* 关键词分析占位 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-500" />
              高消耗低转化关键词
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">连接广告账户后，AI 自动识别在烧钱但无转化的关键词</p>
            <Button size="sm" variant="outline" className="mt-3 h-7 text-xs w-full">
              <Upload className="mr-1.5 h-3 w-3" />
              导入搜索词报告 (CSV)
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              待挖掘高潜关键词
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">AI 分析竞品 listing、买家评论，挖掘你还没覆盖的高转化词</p>
            <Button size="sm" className="mt-3 h-7 text-xs w-full">
              <Zap className="mr-1.5 h-3 w-3" />
              AI 关键词挖掘
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
