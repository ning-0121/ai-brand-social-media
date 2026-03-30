"use client";

import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { ChartCard } from "@/components/shared/chart-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  socialKPIs,
  mockPosts,
  mockAccounts,
  engagementData,
} from "@/modules/social/mock-data";
import { useSupabase } from "@/hooks/use-supabase";
import { getScheduledPosts, getSocialAccounts } from "@/lib/supabase-queries";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Plus, MoreHorizontal, User } from "lucide-react";
import { formatNumber } from "@/lib/format";

export default function SocialPage() {
  const { data: posts, loading: loadingPosts } = useSupabase(getScheduledPosts, mockPosts);
  const { data: accounts, loading: loadingAccounts } = useSupabase(getSocialAccounts, mockAccounts);

  return (
    <div className="space-y-6">
      <PageHeader
        title="社媒运营规划"
        description="统一管理社交媒体发布计划与账号数据"
        actions={
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            新建计划
          </Button>
        }
      />

      <KPICardGrid>
        {socialKPIs.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </KPICardGrid>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">发布队列</TabsTrigger>
          <TabsTrigger value="accounts">账号管理</TabsTrigger>
          <TabsTrigger value="analytics">数据分析</TabsTrigger>
        </TabsList>

        {/* ---------- 发布队列 ---------- */}
        <TabsContent value="queue">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">内容预览</TableHead>
                    <TableHead>平台</TableHead>
                    <TableHead>计划时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPosts
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-[260px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                        </TableRow>
                      ))
                    : posts.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell className="font-medium max-w-xs truncate">
                            {post.content_preview ?? post.content}
                          </TableCell>
                          <TableCell>
                            <PlatformIcon platform={post.platform} showLabel />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(post.scheduled_at).toLocaleString("zh-CN", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={post.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- 账号管理 ---------- */}
        <TabsContent value="accounts">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loadingAccounts
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="transition-shadow hover:shadow-sm">
                    <CardContent className="flex items-center gap-4 p-4">
                      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </CardContent>
                  </Card>
                ))
              : accounts.map((account) => (
                  <Card key={account.id} className="transition-shadow hover:shadow-sm">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <PlatformIcon platform={account.platform} />
                          <span className="text-sm font-medium truncate">
                            {account.display_name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {account.handle}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatNumber(account.followers)} 粉丝
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          account.connected
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        }
                      >
                        {account.connected ? "已连接" : "未连接"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
          </div>
        </TabsContent>

        {/* ---------- 数据分析 ---------- */}
        <TabsContent value="analytics">
          <ChartCard
            title="近 30 天各平台互动率 (%)"
            description="按日统计 TikTok、Instagram、小红书互动率趋势"
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value, name) => {
                      const labels: Record<string, string> = {
                        tiktok: "TikTok",
                        instagram: "Instagram",
                        xiaohongshu: "小红书",
                      };
                      return [`${value}%`, labels[String(name)] || String(name)];
                    }}
                  />
                  <Legend
                    formatter={(value: string) => {
                      const labels: Record<string, string> = {
                        tiktok: "TikTok",
                        instagram: "Instagram",
                        xiaohongshu: "小红书",
                      };
                      return labels[value] || value;
                    }}
                  />
                  <Bar dataKey="tiktok" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="instagram" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="xiaohongshu" fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
