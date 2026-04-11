"use client";

import { useState, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  Plug,
  Unplug,
  Pencil,
  Loader2,
  User,
  Bell,
  Mail,
} from "lucide-react";
import { BrandProfileEditor } from "@/components/brand-profile-editor";
import { TeamManagement } from "@/components/team/team-management";
import {
  getIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  Integration,
} from "@/lib/supabase-integrations";
import { useSupabase } from "@/hooks/use-supabase";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Platform Config                                                     */
/* ------------------------------------------------------------------ */

const PLATFORMS = [
  { id: "shopify", name: "Shopify", desc: "同步商品、订单和收入数据", color: "bg-green-600", fields: ["store_name", "store_url", "access_token"], oauth: false },
  { id: "instagram", name: "Instagram", desc: "OAuth 授权连接 IG 商业账号，发布帖子和获取数据", color: "bg-pink-500", fields: ["store_name", "access_token"], oauth: true },
  { id: "facebook", name: "Facebook", desc: "OAuth 授权连接 Facebook Page，发布动态", color: "bg-blue-600", fields: ["store_name", "access_token"], oauth: true },
  { id: "tiktok", name: "TikTok", desc: "OAuth 授权连接 TikTok 账号，发布短视频", color: "bg-black", fields: ["store_name", "access_token"], oauth: true },
  { id: "tiktok_shop", name: "TikTok Shop", desc: "同步销量、直播和短视频数据", color: "bg-black", fields: ["store_name", "api_key", "api_secret"], oauth: false },
  { id: "amazon", name: "Amazon", desc: "同步产品排名、销量和评价", color: "bg-orange-500", fields: ["store_name", "api_key", "api_secret"], oauth: false },
  { id: "etsy", name: "Etsy", desc: "同步手工艺品店铺数据", color: "bg-orange-600", fields: ["store_name", "api_key"], oauth: false },
  { id: "xiaohongshu", name: "小红书", desc: "同步笔记数据和粉丝画像", color: "bg-red-500", fields: ["store_name", "api_key"], oauth: false },
];

const FIELD_LABELS: Record<string, string> = {
  store_name: "店铺/账号名称",
  store_url: "店铺域名",
  api_key: "API Key",
  api_secret: "API Secret",
  access_token: "Access Token",
};

const FIELD_TYPES: Record<string, string> = {
  store_name: "text",
  store_url: "text",
  api_key: "password",
  api_secret: "password",
  access_token: "password",
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  store_name: "请输入店铺/账号名称",
  store_url: "your-store.myshopify.com",
  api_key: "请输入 API Key",
  api_secret: "请输入 API Secret",
  access_token: "请输入 Access Token",
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: integrations, loading } = useSupabase(getIntegrations, [] as Integration[]);
  const [localIntegrations, setLocalIntegrations] = useState<Integration[]>([]);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<typeof PLATFORMS[number] | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const [oauthMessage, setOauthMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync fetched data to local state
  useEffect(() => {
    setLocalIntegrations(integrations);
  }, [integrations]);

  // Handle OAuth callback messages
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const success = params.get("oauth_success");
    const error = params.get("oauth_error");
    if (success) {
      setOauthMessage({ type: "success", text: `${success} 授权成功，已连接` });
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setOauthMessage(null), 5000);
    } else if (error) {
      setOauthMessage({ type: "error", text: `授权失败: ${error}` });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const refresh = useCallback(() => {
    getIntegrations()
      .then(setLocalIntegrations)
      .catch(() => toast.error("加载失败"));
  }, []);

  // Get connected integration for a platform
  const getConnected = useCallback(
    (platformId: string) =>
      localIntegrations.find(
        (i) => i.platform === platformId && i.status === "active"
      ),
    [localIntegrations]
  );

  // Open connect dialog
  const openConnect = (platform: typeof PLATFORMS[number]) => {
    setSelectedPlatform(platform);
    setFormData({});
    setConnectDialogOpen(true);
  };

  // Open edit dialog
  const openEdit = (platform: typeof PLATFORMS[number], integration: Integration) => {
    setSelectedPlatform(platform);
    setEditingIntegration(integration);
    const data: Record<string, string> = {};
    for (const field of platform.fields) {
      data[field] = (integration as unknown as Record<string, string>)[field] || "";
    }
    setFormData(data);
    setEditDialogOpen(true);
  };

  // Handle connect submit
  const handleConnect = async () => {
    if (!selectedPlatform) return;
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        platform: selectedPlatform.id,
        ...formData,
      };
      if (user?.id) payload.user_id = user.id;
      await createIntegration(payload as Parameters<typeof createIntegration>[0]);
      setConnectDialogOpen(false);
      refresh();
    } catch {
      toast.error("平台连接失败，请检查凭证");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit submit
  const handleEdit = async () => {
    if (!editingIntegration) return;
    setSubmitting(true);
    try {
      await updateIntegration(editingIntegration.id, formData);
      setEditDialogOpen(false);
      refresh();
    } catch {
      toast.error("更新失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = async (integration: Integration) => {
    try {
      await deleteIntegration(integration.id);
      refresh();
    } catch {
      toast.error("断开连接失败");
    }
  };

  // Handle sync — actually calls the Shopify sync API
  const handleSync = async (integration: Integration) => {
    setSyncing(integration.id);
    try {
      const res = await fetch("/api/shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_all",
          integration_id: integration.id,
          user_id: user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`同步失败: ${data.error || res.status}`);
      } else {
        alert(`同步完成: ${data.synced_products || 0} 商品, ${data.synced_orders || 0} 订单, ${data.synced_customers || 0} 客户`);
      }
      refresh();
    } catch {
      toast.error("数据同步失败，请重试");
    } finally {
      setSyncing(null);
    }
  };

  const formatSyncTime = (dateStr?: string) => {
    if (!dateStr) return "从未同步";
    const d = new Date(dateStr);
    return d.toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="系统设置"
        description="管理平台连接和账户设置"
        actions={
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            刷新
          </Button>
        }
      />

      {oauthMessage && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            oauthMessage.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          )}
        >
          {oauthMessage.text}
        </div>
      )}

      <Tabs defaultValue="platforms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="platforms">平台连接</TabsTrigger>
          <TabsTrigger value="brand">品牌画像</TabsTrigger>
          <TabsTrigger value="team">团队管理</TabsTrigger>
          <TabsTrigger value="account">账户设置</TabsTrigger>
        </TabsList>

        {/* ---- 平台连接 ---- */}
        <TabsContent value="platforms">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PLATFORMS.map((platform) => {
                const connected = getConnected(platform.id);
                return (
                  <Card
                    key={platform.id}
                    className="transition-shadow hover:shadow-sm"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm",
                            platform.color
                          )}
                        >
                          {platform.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-semibold">
                              {platform.name}
                            </CardTitle>
                            {connected ? (
                              <Badge
                                variant="outline"
                                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs"
                              >
                                已连接
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-muted text-muted-foreground text-xs"
                              >
                                未连接
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {platform.desc}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {connected ? (
                        <div className="space-y-3">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                店铺名称
                              </span>
                              <span className="font-medium">
                                {connected.store_name}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                最后同步
                              </span>
                              <span className="text-xs tabular-nums">
                                {formatSyncTime(connected.last_synced_at)}
                              </span>
                            </div>
                          </div>
                          <Separator />
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleSync(connected)}
                              disabled={syncing === connected.id}
                            >
                              {syncing === connected.id ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              同步
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(platform, connected)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDisconnect(connected)}
                            >
                              <Unplug className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : platform.oauth ? (
                        <div className="space-y-2">
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              window.location.href = `/api/oauth/${platform.id}/start`;
                            }}
                          >
                            <Plug className="mr-1.5 h-3.5 w-3.5" />
                            OAuth 授权连接
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full text-xs"
                            onClick={() => openConnect(platform)}
                          >
                            或手动输入 token
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => openConnect(platform)}
                        >
                          <Plug className="mr-1.5 h-3.5 w-3.5" />
                          连接
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ---- 品牌画像 ---- */}
        <TabsContent value="brand">
          <BrandProfileEditor />
        </TabsContent>

        {/* ---- 团队管理 ---- */}
        <TabsContent value="team">
          <TeamManagement />
        </TabsContent>

        {/* ---- 账户设置 ---- */}
        <TabsContent value="account">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* 个人信息 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">
                    个人信息
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    用户名
                  </label>
                  <p className="text-sm font-medium">
                    {user?.user_metadata?.full_name ||
                      user?.email?.split("@")[0] ||
                      "未设置"}
                  </p>
                </div>
                <Separator />
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    邮箱
                  </label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm">{user?.email || "未设置"}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    注册时间
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString("zh-CN")
                      : "未知"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 通知设置 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">
                    通知设置
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "订单通知", desc: "新订单和订单状态变更提醒" },
                  { label: "库存预警", desc: "库存不足时发送提醒" },
                  { label: "数据报告", desc: "每周自动发送运营数据报告" },
                  { label: "系统公告", desc: "平台功能更新和维护通知" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                    <div className="flex h-5 w-9 cursor-pointer items-center rounded-full bg-primary px-0.5">
                      <div className="h-4 w-4 translate-x-4 rounded-full bg-white shadow-sm transition-transform" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ---- 连接对话框 ---- */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              连接 {selectedPlatform?.name}
            </DialogTitle>
            <DialogDescription>
              请输入平台连接凭证以同步数据
            </DialogDescription>
          </DialogHeader>
          {selectedPlatform && (
            <div className="space-y-4 py-2">
              {selectedPlatform.fields.map((field) => (
                <div key={field} className="space-y-1.5">
                  <label className="text-sm font-medium">
                    {FIELD_LABELS[field]}
                  </label>
                  <Input
                    type={FIELD_TYPES[field] || "text"}
                    placeholder={FIELD_PLACEHOLDERS[field] || ""}
                    value={formData[field] || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        [field]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              取消
            </DialogClose>
            <Button onClick={handleConnect} disabled={submitting}>
              {submitting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              连接
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- 编辑对话框 ---- */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              编辑 {selectedPlatform?.name} 连接
            </DialogTitle>
            <DialogDescription>
              更新平台连接凭证
            </DialogDescription>
          </DialogHeader>
          {selectedPlatform && (
            <div className="space-y-4 py-2">
              {selectedPlatform.fields.map((field) => (
                <div key={field} className="space-y-1.5">
                  <label className="text-sm font-medium">
                    {FIELD_LABELS[field]}
                  </label>
                  <Input
                    type={FIELD_TYPES[field] || "text"}
                    placeholder={FIELD_PLACEHOLDERS[field] || ""}
                    value={formData[field] || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        [field]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              取消
            </DialogClose>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
