"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { ChartCard } from "@/components/shared/chart-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  mockPosts,
  mockAccounts,
  engagementData,
} from "@/modules/social/mock-data";
import { useSupabase } from "@/hooks/use-supabase";
import { getScheduledPosts, getSocialAccounts, getSocialKPIs } from "@/lib/supabase-queries";
import { KPIData } from "@/lib/types";
import {
  createScheduledPost,
  deleteScheduledPost,
  createSocialAccount,
  deleteSocialAccount,
} from "@/lib/supabase-mutations";
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
import { Plus, MoreHorizontal, User, Trash2, Loader2 } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "xiaohongshu", label: "小红书" },
];

export default function SocialPage() {
  const { data: kpiData } = useSupabase(getSocialKPIs, { totalAccounts: 0, connectedAccounts: 0, queuedPosts: 0, publishedPosts: 0 });
  const socialKPIs: KPIData[] = [
    { label: "已连接账号", value: kpiData.connectedAccounts, trend: "up", trendPercent: 1, icon: "Link", format: "number" },
    { label: "已发布", value: kpiData.publishedPosts, trend: "up", trendPercent: 15, icon: "CheckCircle", format: "number" },
    { label: "排队中", value: kpiData.queuedPosts, trend: "flat", trendPercent: 0, icon: "Clock", format: "number" },
    { label: "总账号", value: kpiData.totalAccounts, trend: "up", trendPercent: 2, icon: "Users", format: "number" },
  ];

  // Data fetching with local refresh
  const { data: initialPosts, loading: loadingPosts } = useSupabase(getScheduledPosts, mockPosts);
  const [localPosts, setLocalPosts] = useState<typeof mockPosts | null>(null);
  const posts = localPosts ?? initialPosts;

  const { data: initialAccounts, loading: loadingAccounts } = useSupabase(getSocialAccounts, mockAccounts);
  const [localAccounts, setLocalAccounts] = useState<typeof mockAccounts | null>(null);
  const accounts = localAccounts ?? initialAccounts;

  const refreshPosts = async () => setLocalPosts(await getScheduledPosts());
  const refreshAccounts = async () => setLocalAccounts(await getSocialAccounts());

  // Create post dialog state
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [postForm, setPostForm] = useState({ content_preview: "", platform: "xiaohongshu", scheduled_at: "" });
  const [savingPost, setSavingPost] = useState(false);

  // Create account dialog state
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [accountForm, setAccountForm] = useState({ platform: "xiaohongshu", handle: "", display_name: "" });
  const [savingAccount, setSavingAccount] = useState(false);

  // Handlers
  const handleCreatePost = async () => {
    setSavingPost(true);
    try {
      await createScheduledPost({
        content_preview: postForm.content_preview,
        platform: postForm.platform,
        scheduled_at: new Date(postForm.scheduled_at).toISOString(),
      });
      setShowPostDialog(false);
      setPostForm({ content_preview: "", platform: "xiaohongshu", scheduled_at: "" });
      await refreshPosts();
    } catch (err) {
      console.error(err);
    }
    setSavingPost(false);
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("确定要删除这条计划吗？")) return;
    await deleteScheduledPost(id);
    await refreshPosts();
  };

  const handleCreateAccount = async () => {
    setSavingAccount(true);
    try {
      await createSocialAccount({
        platform: accountForm.platform,
        handle: accountForm.handle,
        display_name: accountForm.display_name,
      });
      setShowAccountDialog(false);
      setAccountForm({ platform: "xiaohongshu", handle: "", display_name: "" });
      await refreshAccounts();
    } catch (err) {
      console.error(err);
    }
    setSavingAccount(false);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("确定要删除这个账号吗？")) return;
    await deleteSocialAccount(id);
    await refreshAccounts();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="社媒运营规划"
        description="统一管理社交媒体发布计划与账号数据"
        actions={
          <Button size="sm" onClick={() => setShowPostDialog(true)}>
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
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeletePost(post.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">已绑定账号</h3>
            <Button variant="outline" size="sm" onClick={() => setShowAccountDialog(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              添加账号
            </Button>
          </div>
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
                      <div className="flex flex-col items-end gap-2">
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
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteAccount(account.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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

      {/* 新建计划对话框 */}
      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建发布计划</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">内容预览</label>
              <textarea
                className={cn(
                  "flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                )}
                placeholder="请输入发布内容预览"
                value={postForm.content_preview}
                onChange={(e) => setPostForm({ ...postForm, content_preview: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">平台</label>
                <Select value={postForm.platform} onValueChange={(v) => v && setPostForm({ ...postForm, platform: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择平台" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">发布时间</label>
                <Input
                  type="datetime-local"
                  value={postForm.scheduled_at}
                  onChange={(e) => setPostForm({ ...postForm, scheduled_at: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreatePost}
              disabled={savingPost || !postForm.content_preview.trim() || !postForm.scheduled_at}
            >
              {savingPost ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加账号对话框 */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加社媒账号</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">平台</label>
              <Select value={accountForm.platform} onValueChange={(v) => v && setAccountForm({ ...accountForm, platform: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择平台" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">账号名</label>
              <Input
                placeholder="请输入账号名，例如：@brandmind"
                value={accountForm.handle}
                onChange={(e) => setAccountForm({ ...accountForm, handle: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">显示名称</label>
              <Input
                placeholder="请输入显示名称"
                value={accountForm.display_name}
                onChange={(e) => setAccountForm({ ...accountForm, display_name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccountDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreateAccount}
              disabled={savingAccount || !accountForm.handle.trim()}
            >
              {savingAccount ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
