"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  FileText,
  Image as ImageIcon,
  Search,
  Globe,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ContentTask {
  id: string;
  skill_id: string;
  product_name: string | null;
  source_module: string;
  status: string;
  result: Record<string, unknown> | null;
  created_at: string;
}

const SKILL_CATEGORY: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  // SEO
  product_seo_optimize: { label: "SEO 优化", icon: Search, color: "text-green-600" },
  technical_seo_audit: { label: "技术 SEO 审计", icon: Search, color: "text-green-600" },
  seo_ranking_tracker: { label: "排名追踪", icon: Search, color: "text-green-600" },
  // Content
  product_detail_page: { label: "详情页", icon: Globe, color: "text-blue-600" },
  homepage_hero: { label: "首页 Hero", icon: Globe, color: "text-blue-600" },
  landing_page: { label: "落地页", icon: Globe, color: "text-blue-600" },
  // Image
  social_media_image: { label: "社媒配图", icon: ImageIcon, color: "text-pink-600" },
  campaign_poster: { label: "活动海报", icon: ImageIcon, color: "text-pink-600" },
  banner_design: { label: "Banner", icon: ImageIcon, color: "text-pink-600" },
  ai_product_photo: { label: "产品图", icon: ImageIcon, color: "text-pink-600" },
  // Social
  social_post_pack: { label: "社媒帖子", icon: MessageSquare, color: "text-purple-600" },
  content_matrix: { label: "矩阵内容", icon: MessageSquare, color: "text-purple-600" },
  hashtag_strategy: { label: "标签策略", icon: MessageSquare, color: "text-purple-600" },
  content_calendar: { label: "内容日历", icon: MessageSquare, color: "text-purple-600" },
  short_video_script: { label: "视频脚本", icon: MessageSquare, color: "text-purple-600" },
  live_stream_plan: { label: "直播策划", icon: MessageSquare, color: "text-purple-600" },
  ugc_response: { label: "互动回复", icon: MessageSquare, color: "text-purple-600" },
  // Copy
  ad_copy: { label: "广告文案", icon: FileText, color: "text-amber-600" },
  email_copy: { label: "邮件文案", icon: FileText, color: "text-amber-600" },
  product_description: { label: "产品描述", icon: FileText, color: "text-amber-600" },
  // Analysis
  store_growth_planner: { label: "增长诊断", icon: Search, color: "text-cyan-600" },
  competitor_pricing: { label: "竞品定价", icon: Search, color: "text-cyan-600" },
  profit_analysis: { label: "利润分析", icon: Search, color: "text-cyan-600" },
  google_ads_manager: { label: "广告分析", icon: Search, color: "text-cyan-600" },
  instagram_analytics: { label: "IG 分析", icon: Search, color: "text-cyan-600" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "已完成", color: "text-green-600 bg-green-50", icon: CheckCircle2 },
  approved: { label: "已审批", color: "text-blue-600 bg-blue-50", icon: CheckCircle2 },
  failed: { label: "失败", color: "text-red-600 bg-red-50", icon: AlertCircle },
  running: { label: "执行中", color: "text-amber-600 bg-amber-50", icon: Loader2 },
  pending: { label: "待执行", color: "text-gray-500 bg-gray-50", icon: Clock },
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

function extractPreview(result: Record<string, unknown> | null, skillId: string): {
  text: string;
  imageUrl?: string;
} {
  if (!result) return { text: "无结果" };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void skillId;
  const output = (result.output || result) as Record<string, unknown>;

  // 图片
  if (output.image_url) return { text: (output.headline as string) || "AI 生成图片", imageUrl: output.image_url as string };

  // SEO
  if (output.meta_title) return { text: `标题: ${output.meta_title}\n描述: ${(output.meta_description as string || "").slice(0, 80)}...` };

  // 社媒帖子
  if (output.posts && Array.isArray(output.posts)) {
    const first = (output.posts as Array<Record<string, unknown>>)[0];
    return { text: `${first?.title || ""}\n${(first?.body as string || "").slice(0, 100)}...` };
  }

  // 矩阵内容
  if (output.contents && Array.isArray(output.contents)) {
    return { text: `${(output.contents as Array<Record<string, unknown>>).length} 个平台的内容已生成` };
  }

  // 直播
  if (output.scripts && Array.isArray(output.scripts)) {
    return { text: `直播脚本: ${(output.scripts as Array<Record<string, unknown>>).length} 个阶段` };
  }

  // 通用文本
  if (output.diagnosis) return { text: (output.diagnosis as string).slice(0, 150) };
  if (output.body) return { text: (output.body as string).slice(0, 150) };
  if (output.description) return { text: (output.description as string).slice(0, 150) };
  if (output.raw_text) return { text: (output.raw_text as string).slice(0, 150) };

  return { text: JSON.stringify(output).slice(0, 120) + "..." };
}

export function AIProductionWarehouse() {
  const [tasks, setTasks] = useState<ContentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "image" | "seo" | "social" | "copy" | "analysis">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/content-plan?type=tasks");
      const data = await res.json();
      // 合并 completed + approved 的任务（有结果的）
      const all = [...(data.completed || []), ...(data.pending || [])];
      setTasks(all.filter((t: ContentTask) => t.status === "completed" || t.status === "approved" || t.status === "failed"));
    } catch {
      toast.error("加载产出记录失败");
    }
    setLoading(false);
  };

  const categorizeSkill = (skillId: string): string => {
    if (["social_media_image", "campaign_poster", "banner_design", "ai_product_photo"].includes(skillId)) return "image";
    if (["product_seo_optimize", "technical_seo_audit", "seo_ranking_tracker"].includes(skillId)) return "seo";
    if (["social_post_pack", "content_matrix", "hashtag_strategy", "content_calendar", "short_video_script", "live_stream_plan", "ugc_response"].includes(skillId)) return "social";
    if (["ad_copy", "email_copy", "product_description"].includes(skillId)) return "copy";
    if (["store_growth_planner", "competitor_pricing", "profit_analysis", "google_ads_manager", "instagram_analytics", "marketing_calendar", "restock_planner", "influencer_strategy"].includes(skillId)) return "analysis";
    return "copy";
  };

  const filtered = filter === "all" ? tasks : tasks.filter(t => categorizeSkill(t.skill_id) === filter);

  const counts = {
    all: tasks.length,
    image: tasks.filter(t => categorizeSkill(t.skill_id) === "image").length,
    seo: tasks.filter(t => categorizeSkill(t.skill_id) === "seo").length,
    social: tasks.filter(t => categorizeSkill(t.skill_id) === "social").length,
    copy: tasks.filter(t => categorizeSkill(t.skill_id) === "copy").length,
    analysis: tasks.filter(t => categorizeSkill(t.skill_id) === "analysis").length,
  };

  if (loading) return <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "all", label: "全部" },
          { key: "seo", label: "🔍 SEO" },
          { key: "social", label: "📱 社媒" },
          { key: "image", label: "🎨 图片" },
          { key: "copy", label: "✍️ 文案" },
          { key: "analysis", label: "📊 分析" },
        ] as const).map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter(key)}
          >
            {label} ({counts[key]})
          </Button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {filter === "all" ? "AI 还没有产出任何内容。去运营驾驶舱执行任务，或在上方使用 Skill 生成内容。" : `没有 ${filter} 类型的产出`}
          </CardContent>
        </Card>
      ) : (
        filtered.map((task) => {
          const skillInfo = SKILL_CATEGORY[task.skill_id] || { label: task.skill_id, icon: FileText, color: "text-gray-600" };
          const SkillIcon = skillInfo.icon;
          const statusInfo = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
          const StatusIcon = statusInfo.icon;
          const preview = extractPreview(task.result, task.skill_id);
          const isExpanded = expandedId === task.id;

          return (
            <Card key={task.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Header */}
                <button
                  className="w-full p-3 flex items-start gap-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : task.id)}
                >
                  <SkillIcon className={cn("h-4 w-4 mt-0.5 shrink-0", skillInfo.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium">{skillInfo.label}</span>
                      {task.product_name && (
                        <span className="text-xs text-muted-foreground">· {task.product_name}</span>
                      )}
                      <Badge className={cn("text-[9px] ml-auto", statusInfo.color)}>
                        <StatusIcon className={cn("h-2.5 w-2.5 mr-0.5", task.status === "running" && "animate-spin")} />
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">
                      {preview.text}
                    </p>
                    <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                      {formatTimeAgo(task.created_at)} · {task.source_module || "manual"}
                    </span>
                  </div>
                  {preview.imageUrl && (
                    <img src={preview.imageUrl} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
                  )}
                  {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 mt-1" /> : <ChevronRight className="h-4 w-4 shrink-0 mt-1" />}
                </button>

                {/* Expanded detail */}
                {isExpanded && task.result && (
                  <div className="border-t px-3 py-3 bg-muted/20">
                    {preview.imageUrl && (
                      <div className="mb-3">
                        <img src={preview.imageUrl} alt="" className="max-h-64 rounded-lg" />
                      </div>
                    )}
                    <pre className="text-[11px] font-mono whitespace-pre-wrap overflow-x-auto max-h-80 overflow-y-auto bg-background rounded p-3 border">
                      {JSON.stringify(task.result, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
