"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import {
  Plus,
  Loader2,
  Calendar,
  Sparkles,
  Megaphone,
  ArrowRight,
  Trash2,
  Users,
  Network,
  Handshake,
  BarChart3,
  FlaskConical,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Campaign {
  id: string; name: string; campaign_type: string; status: string;
  start_date: string | null; end_date: string | null; budget: number | null;
  discount_strategy: string | null; target_revenue: number | null;
  ai_plan: Record<string, unknown> | null; created_at: string;
}

interface KolPartner {
  id: string; creator_handle: string; platform: string; tier: string;
  follower_count: number | null; engagement_rate: number | null;
  deal_type: string; status: string; attributed_revenue: number | null;
  expected_reach: number | null;
}

interface AffiliateMember {
  id: string; name: string; email: string; referral_code: string;
  tier: string; commission_pct: number; total_sales_usd: number;
  total_commissions_usd: number; order_count: number; status: string;
}

interface BrandCollab {
  id: string; partner_brand_name: string; collab_type: string; status: string;
  budget_usd: number | null; actual_attributed_revenue: number | null;
  start_date: string | null; end_date: string | null;
}

interface MarketplaceEval {
  id: string; platform: string; readiness_score: number;
  recommendation: string; status: string;
}

interface IncrementalityTest {
  id: string; channel: string; methodology: string; status: string;
  reported_roas: number | null; actual_iroas: number | null; lift_pct: number | null;
  test_start_date: string | null;
}

interface OverviewMetrics {
  campaigns: { total: number; active: number; total_budget: number };
  kols: { active: number; attributed_revenue: number; total_reach: number };
  affiliates: { active: number; attributed_revenue: number; commissions_paid: number };
  collabs: { active: number; attributed_revenue: number };
  incrementality: { tests_completed: number; avg_lift_pct: number | null };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  black_friday: "黑五大促", new_launch: "新品首发", seasonal: "季节活动",
  clearance: "季末清仓", holiday: "节日营销", flash_sale: "限时闪购", custom: "自定义",
};

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  planning: { label: "策划中", color: "bg-blue-100 text-blue-700" },
  preparing: { label: "准备中", color: "bg-amber-100 text-amber-700" },
  active: { label: "进行中", color: "bg-green-100 text-green-700" },
  ended: { label: "已结束", color: "bg-gray-100 text-gray-600" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-600" },
};

const KOL_TIER_LABELS: Record<string, string> = {
  nano: "Nano (1K-10K)", micro: "Micro (10K-100K)",
  mid: "Mid (100K-500K)", mega: "Mega (500K+)", ugc: "UGC Creator",
};

const AFFILIATE_TIER_CFG: Record<string, { label: string; color: string; commission: string }> = {
  brand_friend: { label: "Brand Friend", color: "bg-gray-100 text-gray-700", commission: "12%" },
  brand_advocate: { label: "Brand Advocate", color: "bg-blue-100 text-blue-700", commission: "15%" },
  brand_elite: { label: "Brand Elite", color: "bg-purple-100 text-purple-700", commission: "18%" },
  vip_ambassador: { label: "VIP Ambassador", color: "bg-amber-100 text-amber-700", commission: "20%" },
};

const MARKETPLACE_LABELS: Record<string, string> = {
  amazon: "Amazon FBA", tiktok_shop: "TikTok Shop",
  walmart: "Walmart", wholesale: "批发/零售", etsy: "Etsy", other: "其他",
};

const REC_CFG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  go_now: { label: "立即启动", color: "text-green-600", icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
  wait_6mo: { label: "6个月后", color: "text-amber-600", icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> },
  wait_1yr: { label: "1年后考虑", color: "text-orange-600", icon: <AlertTriangle className="h-4 w-4 text-orange-500" /> },
  not_recommended: { label: "暂不推荐", color: "text-red-600", icon: <AlertTriangle className="h-4 w-4 text-red-500" /> },
};

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "总览", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: "campaigns", label: "活动列表", icon: <Megaphone className="h-3.5 w-3.5" /> },
  { id: "kols", label: "KOL 合作", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "affiliates", label: "联盟分销", icon: <Network className="h-3.5 w-3.5" /> },
  { id: "collabs", label: "品牌联名", icon: <Handshake className="h-3.5 w-3.5" /> },
  { id: "marketplace", label: "渠道扩张", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { id: "incrementality", label: "增量测试", icon: <FlaskConical className="h-3.5 w-3.5" /> },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [marketplaces, setMarketplaces] = useState<MarketplaceEval[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [kols, setKols] = useState<KolPartner[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateMember[]>([]);
  const [collabs, setCollabs] = useState<BrandCollab[]>([]);
  const [tests, setTests] = useState<IncrementalityTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiRecs, setAiRecs] = useState<Record<string, unknown> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Campaign create state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", campaign_type: "seasonal", budget: "", start_date: "", end_date: "" });

  // KOL create state
  const [showKolCreate, setShowKolCreate] = useState(false);
  const [kolForm, setKolForm] = useState({
    creator_handle: "", platform: "instagram", tier: "micro",
    follower_count: "", engagement_rate: "", deal_type: "affiliate",
    commission_pct: "12", status: "prospecting",
  });

  // Affiliate create state
  const [showAffCreate, setShowAffCreate] = useState(false);
  const [affForm, setAffForm] = useState({ name: "", email: "", referral_code: "", tier: "brand_friend", commission_pct: "12" });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [ovRes, campRes, kolRes, affRes, collabRes] = await Promise.all([
      fetch("/api/campaigns?action=overview"),
      fetch("/api/campaigns?action=campaigns"),
      fetch("/api/campaigns?action=kols"),
      fetch("/api/campaigns?action=affiliates"),
      fetch("/api/campaigns?action=collabs"),
    ]);
    const [ov, camp, kol, aff, collab] = await Promise.all([
      ovRes.json(), campRes.json(), kolRes.json(), affRes.json(), collabRes.json(),
    ]);
    setOverview(ov.metrics || null);
    setMarketplaces(ov.marketplace_evaluations || []);
    setTests(ov.recent_tests || []);
    setCampaigns(camp.campaigns || []);
    setKols(kol.kols || []);
    setAffiliates(aff.affiliates || []);
    setCollabs(collab.collabs || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchAiRecs = async () => {
    setAiLoading(true);
    const res = await fetch("/api/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ai_weekly_recommendations" }),
    });
    const data = await res.json();
    setAiRecs(data);
    setAiLoading(false);
  };

  const handleCreateCampaign = async () => {
    setCreating(true);
    await fetch("/api/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...form, budget: parseFloat(form.budget) || null, status: "planning" }),
    });
    setShowCreate(false); setForm({ name: "", campaign_type: "seasonal", budget: "", start_date: "", end_date: "" });
    await fetchAll(); setCreating(false);
  };

  const handleCreateKol = async () => {
    setCreating(true);
    await fetch("/api/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_kol", kol: {
          ...kolForm,
          follower_count: parseInt(kolForm.follower_count) || null,
          engagement_rate: parseFloat(kolForm.engagement_rate) || null,
          commission_pct: parseFloat(kolForm.commission_pct) || 12,
        }
      }),
    });
    setShowKolCreate(false); await fetchAll(); setCreating(false);
  };

  const handleCreateAffiliate = async () => {
    setCreating(true);
    await fetch("/api/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_affiliate", affiliate: {
          ...affForm, commission_pct: parseFloat(affForm.commission_pct) || 12,
        }
      }),
    });
    setShowAffCreate(false); await fetchAll(); setCreating(false);
  };

  const updateCampaignStatus = async (id: string, status: string) => {
    await fetch("/api/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, status }),
    });
    await fetchAll();
  };

  const deleteCampaign = async (id: string) => {
    await fetch("/api/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    await fetchAll();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="活动运营中心"
        description="年度活动 · KOL 合作 · 联盟分销 · 品牌联名 · 渠道扩张 · 增量测试"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAiRecs} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />}
              AI 本周建议
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />新建活动</Button>
          </div>
        }
      />

      {/* AI 本周建议 */}
      {aiRecs && (aiRecs as { top_3_actions?: unknown[] }).top_3_actions && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-800">AI 本周优先动作</span>
              {(aiRecs as { one_line_insight?: string }).one_line_insight && (
                <span className="text-xs text-amber-600 ml-2">— {(aiRecs as { one_line_insight: string }).one_line_insight}</span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {((aiRecs as { top_3_actions: Array<{rank: number; area: string; action: string; rationale: string; expected_impact: string; implementation_days: number; human_decision_required: boolean; decision_note?: string}> }).top_3_actions || []).map((a) => (
                <div key={a.rank} className="bg-white rounded-md p-3 border border-amber-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge variant="outline" className="text-[10px] h-4">{a.area}</Badge>
                    {a.human_decision_required && (
                      <Badge variant="outline" className="text-[10px] h-4 bg-orange-50 text-orange-600 border-orange-200">⚠️ 需人工确认</Badge>
                    )}
                  </div>
                  <p className="text-xs font-medium">{a.action}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.rationale}</p>
                  <p className="text-[10px] text-green-600 font-medium mt-1">{a.expected_impact}</p>
                  {a.decision_note && (
                    <p className="text-[10px] text-orange-600 mt-1 italic">决策点：{a.decision_note}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto pb-0">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* ── 总览 Tab ─────────────────────────────────────────────────────── */}
          {tab === "overview" && overview && (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">活动</p>
                  <p className="text-2xl font-bold mt-1">{overview.campaigns.total}</p>
                  <p className="text-[10px] text-green-600">{overview.campaigns.active} 进行中</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">KOL 合作</p>
                  <p className="text-2xl font-bold mt-1">{overview.kols.active}</p>
                  <p className="text-[10px] text-muted-foreground">归因 ${overview.kols.attributed_revenue.toLocaleString()}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">联盟成员</p>
                  <p className="text-2xl font-bold mt-1">{overview.affiliates.active}</p>
                  <p className="text-[10px] text-muted-foreground">带货 ${overview.affiliates.attributed_revenue.toLocaleString()}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">品牌联名</p>
                  <p className="text-2xl font-bold mt-1">{overview.collabs.active}</p>
                  <p className="text-[10px] text-muted-foreground">归因 ${overview.collabs.attributed_revenue.toLocaleString()}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">增量测试</p>
                  <p className="text-2xl font-bold mt-1">{overview.incrementality.tests_completed}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {overview.incrementality.avg_lift_pct != null
                      ? `平均增量 +${overview.incrementality.avg_lift_pct.toFixed(1)}%`
                      : "暂无完成测试"}
                  </p>
                </CardContent></Card>
              </div>

              {/* Marketplace Evaluations */}
              {marketplaces.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">渠道扩张评分</CardTitle></CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-2">
                      {marketplaces.map((m) => {
                        const rec = REC_CFG[m.recommendation] || REC_CFG.wait_6mo;
                        return (
                          <div key={m.id} className="flex items-center gap-3 p-2 rounded-md border">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-medium">{MARKETPLACE_LABELS[m.platform] || m.platform}</p>
                                <div className="flex items-center gap-1">{rec.icon}<span className={cn("text-[10px] font-medium", rec.color)}>{rec.label}</span></div>
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${m.readiness_score}%` }} />
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground">{m.readiness_score}/100</span>
                              </div>
                            </div>
                            <button onClick={() => setTab("marketplace")} className="text-[10px] text-primary flex items-center gap-0.5">
                              详情<ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick AI Skill links */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {[
                  { label: "年度营销日历", desc: "6-8 锚点大促 + 预算分配", href: "/content", icon: <Calendar className="h-4 w-4 text-violet-500" /> },
                  { label: "KOL 合作策略", desc: "分级 Brief + 招募邮件", href: "/content", icon: <Users className="h-4 w-4 text-pink-500" /> },
                  { label: "联盟体系设计", desc: "佣金结构 + 防刷量规则", href: "/content", icon: <Network className="h-4 w-4 text-emerald-500" /> },
                  { label: "品牌联名匹配", desc: "互补品牌 + 开口话术", href: "/content", icon: <Handshake className="h-4 w-4 text-blue-500" /> },
                  { label: "渠道扩张评分", desc: "Amazon/TikTok Shop 就绪度", href: "/content", icon: <TrendingUp className="h-4 w-4 text-orange-500" /> },
                  { label: "增量测试设计", desc: "真实 iROAS vs 归因幻觉", href: "/content", icon: <FlaskConical className="h-4 w-4 text-purple-500" /> },
                ].map((item) => (
                  <a key={item.label} href={item.href}
                    className="flex items-start gap-3 p-3 border rounded-md hover:bg-muted transition-colors">
                    <div className="shrink-0 mt-0.5">{item.icon}</div>
                    <div>
                      <p className="text-xs font-medium">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto shrink-0 mt-0.5" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── 活动列表 Tab ──────────────────────────────────────────────────── */}
          {tab === "campaigns" && (
            <div className="space-y-3">
              {campaigns.length === 0 ? (
                <Card className="border-dashed"><CardContent className="py-12 text-center">
                  <Megaphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">暂无活动</p>
                  <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />新建活动</Button>
                </CardContent></Card>
              ) : campaigns.map((c) => {
                const cfg = STATUS_CFG[c.status] || STATUS_CFG.planning;
                return (
                  <Card key={c.id} className="hover:shadow-sm"><CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-semibold">{c.name}</p>
                          <Badge variant="outline" className="text-[10px]">{CAMPAIGN_TYPE_LABELS[c.campaign_type] || c.campaign_type}</Badge>
                          <Badge variant="outline" className={cn("text-[10px]", cfg.color)}>{cfg.label}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          {c.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{c.start_date}{c.end_date ? ` ~ ${c.end_date}` : ""}</span>}
                          {c.budget && <span>${c.budget.toLocaleString()} 预算</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {c.status === "planning" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateCampaignStatus(c.id, "preparing")}>开始准备<ArrowRight className="ml-1 h-3 w-3" /></Button>}
                        {c.status === "preparing" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateCampaignStatus(c.id, "active")}>启动<ArrowRight className="ml-1 h-3 w-3" /></Button>}
                        {c.status === "active" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateCampaignStatus(c.id, "ended")}>结束</Button>}
                        <Button size="sm" variant="ghost" className="h-7 text-muted-foreground" onClick={() => deleteCampaign(c.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </CardContent></Card>
                );
              })}
            </div>
          )}

          {/* ── KOL 合作 Tab ──────────────────────────────────────────────────── */}
          {tab === "kols" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowKolCreate(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />添加创作者</Button>
              </div>
              {kols.length === 0 ? (
                <Card className="border-dashed"><CardContent className="py-12 text-center">
                  <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">暂无 KOL 合作记录</p>
                  <p className="text-xs text-muted-foreground mt-1">用「内容工厂 → KOL 发现策略」生成分层合作方案</p>
                  <a href="/content" className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                    <Sparkles className="h-3.5 w-3.5" />生成 KOL 策略
                  </a>
                </CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {kols.map((k) => (
                    <Card key={k.id} className="hover:shadow-sm"><CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">@{k.creator_handle}</p>
                            <Badge variant="outline" className="text-[10px]">{k.platform}</Badge>
                            <Badge variant="outline" className="text-[10px]">{KOL_TIER_LABELS[k.tier] || k.tier}</Badge>
                            <Badge variant="outline" className={cn("text-[10px]", k.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100")}>{k.status}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            {k.follower_count && <span>{(k.follower_count / 1000).toFixed(0)}K 粉丝</span>}
                            {k.engagement_rate && <span>{k.engagement_rate}% 参与率</span>}
                            {k.attributed_revenue && <span className="text-green-600">归因 ${k.attributed_revenue.toLocaleString()}</span>}
                            {k.expected_reach && <span>{(k.expected_reach / 1000).toFixed(0)}K 预期触达</span>}
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground shrink-0">
                          {k.deal_type} {k.deal_type === "affiliate" ? "联盟" : ""}
                        </div>
                      </div>
                    </CardContent></Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 联盟分销 Tab ───────────────────────────────────────────────────── */}
          {tab === "affiliates" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>总归因收入 <strong className="text-foreground">${overview?.affiliates.attributed_revenue.toLocaleString() || 0}</strong></span>
                  <span>· 佣金支出 <strong className="text-foreground">${overview?.affiliates.commissions_paid.toLocaleString() || 0}</strong></span>
                </div>
                <Button size="sm" onClick={() => setShowAffCreate(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />添加成员</Button>
              </div>
              {affiliates.length === 0 ? (
                <Card className="border-dashed"><CardContent className="py-12 text-center">
                  <Network className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">暂无联盟成员</p>
                  <p className="text-xs text-muted-foreground mt-1">用「联盟分销体系设计」生成完整佣金结构和招募话术</p>
                </CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {affiliates.map((a) => {
                    const tierCfg = AFFILIATE_TIER_CFG[a.tier] || AFFILIATE_TIER_CFG.brand_friend;
                    return (
                      <Card key={a.id} className="hover:shadow-sm"><CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium">{a.name}</p>
                              <Badge variant="outline" className={cn("text-[10px]", tierCfg.color)}>{tierCfg.label}</Badge>
                              <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{a.referral_code}</code>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                              <span className="text-green-600 font-medium">${a.total_sales_usd.toLocaleString()} 带货</span>
                              <span>佣金 {tierCfg.commission}</span>
                              <span>{a.order_count} 单</span>
                              <span className="text-muted-foreground">{a.email}</span>
                            </div>
                          </div>
                          <div className="text-[10px] text-muted-foreground shrink-0">
                            <Badge variant="outline" className={a.status === "active" ? "bg-green-100 text-green-700" : ""}>{a.status}</Badge>
                          </div>
                        </div>
                      </CardContent></Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 品牌联名 Tab ───────────────────────────────────────────────────── */}
          {tab === "collabs" && (
            <div className="space-y-3">
              {collabs.length === 0 ? (
                <Card className="border-dashed"><CardContent className="py-12 text-center">
                  <Handshake className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">暂无品牌联名记录</p>
                  <p className="text-xs text-muted-foreground mt-1">用「品牌联名匹配」找到最佳合作伙伴 + 获取开口邮件模板</p>
                  <a href="/content" className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                    <Sparkles className="h-3.5 w-3.5" />找联名伙伴
                  </a>
                </CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {collabs.map((c) => (
                    <Card key={c.id}><CardContent className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{c.partner_brand_name}</p>
                            <Badge variant="outline" className="text-[10px]">{c.collab_type?.replace("_", " ")}</Badge>
                            <Badge variant="outline" className={cn("text-[10px]",
                              c.status === "active" ? "bg-green-100 text-green-700" :
                              c.status === "completed" ? "bg-gray-100" : "bg-blue-100 text-blue-700"
                            )}>{c.status}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            {c.budget_usd && <span>${c.budget_usd.toLocaleString()} 预算</span>}
                            {c.actual_attributed_revenue && <span className="text-green-600">归因 ${c.actual_attributed_revenue.toLocaleString()}</span>}
                            {c.start_date && <span>{c.start_date}{c.end_date ? ` ~ ${c.end_date}` : ""}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent></Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 渠道扩张 Tab ───────────────────────────────────────────────────── */}
          {tab === "marketplace" && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground pb-1">
                ⚠️ 渠道扩张是战略决策，AI 评分仅供参考 — 最终进入决策需 CEO 审批
              </div>
              {marketplaces.length === 0 ? (
                <Card className="border-dashed"><CardContent className="py-12 text-center">
                  <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">暂无渠道评估数据</p>
                  <p className="text-xs text-muted-foreground mt-1">运行「渠道扩张评分」生成 Amazon / TikTok Shop 就绪度分析</p>
                </CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {marketplaces.map((m) => {
                    const rec = REC_CFG[m.recommendation] || REC_CFG.wait_6mo;
                    return (
                      <Card key={m.id}><CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="text-sm font-semibold">{MARKETPLACE_LABELS[m.platform] || m.platform}</p>
                              <div className="flex items-center gap-1">{rec.icon}<span className={cn("text-xs font-medium", rec.color)}>{rec.label}</span></div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 max-w-xs">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] text-muted-foreground">就绪度</span>
                                  <span className="text-[10px] font-bold">{m.readiness_score}/100</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full transition-all",
                                    m.readiness_score >= 75 ? "bg-green-500" :
                                    m.readiness_score >= 50 ? "bg-amber-500" : "bg-red-400"
                                  )} style={{ width: `${m.readiness_score}%` }} />
                                </div>
                              </div>
                              <Badge variant="outline" className={cn("text-[10px]",
                                m.status === "launched" ? "bg-green-100 text-green-700" :
                                m.status === "in_progress" ? "bg-blue-100 text-blue-700" : ""
                              )}>{m.status}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent></Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 增量测试 Tab ───────────────────────────────────────────────────── */}
          {tab === "incrementality" && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground pb-1">
                💡 Last-click 归因平均高估广告 ROI 30-50%。增量测试揭示真实 iROAS，帮助正确分配预算。
              </div>
              {tests.length === 0 ? (
                <Card className="border-dashed"><CardContent className="py-12 text-center">
                  <FlaskConical className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">暂无增量测试记录</p>
                  <p className="text-xs text-muted-foreground mt-1">用「增量测试设计」生成 Holdout 测试方案，揭示真实广告价值</p>
                  <a href="/content" className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                    <Sparkles className="h-3.5 w-3.5" />设计增量测试
                  </a>
                </CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {tests.map((t) => (
                    <Card key={t.id}><CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{t.channel}</p>
                            <Badge variant="outline" className="text-[10px]">{t.methodology?.replace("_", " ")}</Badge>
                            <Badge variant="outline" className={cn("text-[10px]",
                              t.status === "completed" ? "bg-green-100 text-green-700" :
                              t.status === "running" ? "bg-blue-100 text-blue-700" : ""
                            )}>{t.status}</Badge>
                          </div>
                          {t.status === "completed" && t.reported_roas && t.actual_iroas && (
                            <div className="flex items-center gap-4 mt-1 text-[10px]">
                              <span className="text-muted-foreground">归因 ROAS: <strong>{t.reported_roas}x</strong></span>
                              <span className="text-green-600">真实 iROAS: <strong>{t.actual_iroas}x</strong></span>
                              {t.lift_pct && <span className={t.lift_pct > 0 ? "text-green-600" : "text-red-600"}>
                                增量: {t.lift_pct > 0 ? "+" : ""}{t.lift_pct.toFixed(1)}%
                              </span>}
                              <span className="text-amber-600 font-medium">
                                归因偏差: {((t.reported_roas - t.actual_iroas) / t.reported_roas * 100).toFixed(0)}% 高估
                              </span>
                            </div>
                          )}
                          {t.test_start_date && <p className="text-[10px] text-muted-foreground mt-0.5">开始: {t.test_start_date}</p>}
                        </div>
                      </div>
                    </CardContent></Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── 创建活动 Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent><DialogHeader><DialogTitle>新建营销活动</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-medium">活动名称</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="如：春季上新活动" /></div>
            <div><label className="text-xs font-medium">活动类型</label>
              <Select value={form.campaign_type} onValueChange={(v) => v && setForm({ ...form, campaign_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CAMPAIGN_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">开始日期</label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-1" /></div>
              <div><label className="text-xs font-medium">结束日期</label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="mt-1" /></div>
            </div>
            <div><label className="text-xs font-medium">预算 (USD)</label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="mt-1" placeholder="10000" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreateCampaign} disabled={creating || !form.name}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 添加 KOL Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showKolCreate} onOpenChange={setShowKolCreate}>
        <DialogContent><DialogHeader><DialogTitle>添加创作者合作</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-medium">账号 Handle</label>
              <Input value={kolForm.creator_handle} onChange={(e) => setKolForm({ ...kolForm, creator_handle: e.target.value })} className="mt-1" placeholder="@username" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">平台</label>
                <Select value={kolForm.platform} onValueChange={(v) => v && setKolForm({ ...kolForm, platform: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["tiktok","instagram","youtube","pinterest"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><label className="text-xs font-medium">层级</label>
                <Select value={kolForm.tier} onValueChange={(v) => v && setKolForm({ ...kolForm, tier: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(KOL_TIER_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">粉丝数</label><Input type="number" value={kolForm.follower_count} onChange={(e) => setKolForm({ ...kolForm, follower_count: e.target.value })} className="mt-1" placeholder="50000" /></div>
              <div><label className="text-xs font-medium">参与率 (%)</label><Input type="number" value={kolForm.engagement_rate} onChange={(e) => setKolForm({ ...kolForm, engagement_rate: e.target.value })} className="mt-1" placeholder="3.86" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">合作形式</label>
                <Select value={kolForm.deal_type} onValueChange={(v) => v && setKolForm({ ...kolForm, deal_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="affiliate">联盟佣金</SelectItem>
                    <SelectItem value="gifting">产品礼品</SelectItem>
                    <SelectItem value="flat_fee">固定费用</SelectItem>
                    <SelectItem value="hybrid">混合</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><label className="text-xs font-medium">佣金率 (%)</label><Input type="number" value={kolForm.commission_pct} onChange={(e) => setKolForm({ ...kolForm, commission_pct: e.target.value })} className="mt-1" placeholder="12" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKolCreate(false)}>取消</Button>
            <Button onClick={handleCreateKol} disabled={creating || !kolForm.creator_handle}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 添加联盟成员 Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showAffCreate} onOpenChange={setShowAffCreate}>
        <DialogContent><DialogHeader><DialogTitle>添加联盟成员</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-medium">姓名</label><Input value={affForm.name} onChange={(e) => setAffForm({ ...affForm, name: e.target.value })} className="mt-1" /></div>
            <div><label className="text-xs font-medium">邮件</label><Input type="email" value={affForm.email} onChange={(e) => setAffForm({ ...affForm, email: e.target.value })} className="mt-1" /></div>
            <div><label className="text-xs font-medium">专属折扣码</label><Input value={affForm.referral_code} onChange={(e) => setAffForm({ ...affForm, referral_code: e.target.value.toUpperCase() })} className="mt-1" placeholder="SARAH15" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">初始层级</label>
                <Select value={affForm.tier} onValueChange={(v) => {
                  if (!v) return;
                  const commMap: Record<string, string> = { brand_friend: "12", brand_advocate: "15", brand_elite: "18", vip_ambassador: "20" };
                  setAffForm({ ...affForm, tier: v, commission_pct: commMap[v] ?? "12" });
                }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(AFFILIATE_TIER_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label} ({v.commission})</SelectItem>)}</SelectContent>
                </Select></div>
              <div><label className="text-xs font-medium">佣金率 (%)</label><Input type="number" value={affForm.commission_pct} onChange={(e) => setAffForm({ ...affForm, commission_pct: e.target.value })} className="mt-1" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAffCreate(false)}>取消</Button>
            <Button onClick={handleCreateAffiliate} disabled={creating || !affForm.name || !affForm.email || !affForm.referral_code}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
