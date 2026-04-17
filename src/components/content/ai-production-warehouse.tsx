"use client";

import { useEffect, useState, useCallback } from "react";
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
  RefreshCw,
  ExternalLink,
  Grid3x3,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TaskResultRenderer } from "@/components/ops/task-result-renderer";
import type { WarehouseItem } from "@/app/api/content-warehouse/route";

const SKILL_LABEL: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  product_seo_optimize: { label: "SEO 优化", icon: Search, color: "text-green-600" },
  technical_seo_audit: { label: "技术 SEO", icon: Search, color: "text-green-600" },
  product_detail_page: { label: "详情页", icon: Globe, color: "text-blue-600" },
  landing_page: { label: "落地页", icon: Globe, color: "text-blue-600" },
  homepage_hero: { label: "首页 Hero", icon: Globe, color: "text-blue-600" },
  social_media_image: { label: "社媒配图", icon: ImageIcon, color: "text-pink-600" },
  campaign_poster: { label: "活动海报", icon: ImageIcon, color: "text-pink-600" },
  banner_design: { label: "Banner", icon: ImageIcon, color: "text-pink-600" },
  ai_product_photo: { label: "AI 商品图", icon: ImageIcon, color: "text-pink-600" },
  social_post_pack: { label: "社媒帖子", icon: MessageSquare, color: "text-purple-600" },
  hashtag_strategy: { label: "标签策略", icon: MessageSquare, color: "text-purple-600" },
  content_calendar: { label: "内容日历", icon: MessageSquare, color: "text-purple-600" },
  short_video_script: { label: "视频脚本", icon: MessageSquare, color: "text-purple-600" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  completed: { label: "已完成", color: "text-green-600 bg-green-50 border-green-200" },
  auto_executed: { label: "已执行", color: "text-green-600 bg-green-50 border-green-200" },
  approved: { label: "已审批", color: "text-blue-600 bg-blue-50 border-blue-200" },
  failed: { label: "失败", color: "text-red-600 bg-red-50 border-red-200" },
  running: { label: "执行中", color: "text-amber-600 bg-amber-50 border-amber-200" },
  pending: { label: "待执行", color: "text-gray-500 bg-gray-50 border-gray-200" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function getTextPreview(result: Record<string, unknown> | null): string {
  if (!result) return "";
  const output = (result.output || result) as Record<string, unknown>;
  if (output.meta_title) return `${output.meta_title}`;
  if (output.headline) return `${output.headline}`;
  if (Array.isArray(output.posts) && (output.posts as unknown[]).length > 0) {
    const first = (output.posts as Array<Record<string, unknown>>)[0];
    return String(first?.title || first?.body || "").slice(0, 80);
  }
  if (output.action) return String(output.action);
  return "";
}

// ─── Image Gallery Card ───────────────────────────────

function ImageCard({ item, onExpand }: { item: WarehouseItem; onExpand: () => void }) {
  const skillInfo = SKILL_LABEL[item.skill_id] || { label: item.skill_id, icon: ImageIcon, color: "text-pink-600" };
  const output = ((item.result?.output || item.result) ?? {}) as Record<string, unknown>;
  const headline = output.headline as string | undefined;

  return (
    <div
      className="group cursor-pointer rounded-lg overflow-hidden border bg-card hover:shadow-md transition-all"
      onClick={onExpand}
    >
      <div className="relative aspect-square bg-black">
        <img
          src={item.image_url!}
          alt={headline || skillInfo.label}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <a
          href={item.image_url!}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 bg-black/50 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ExternalLink className="h-3 w-3 text-white" />
        </a>
        <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {headline && <p className="text-white text-xs font-medium line-clamp-1">{headline}</p>}
        </div>
      </div>
      <div className="p-2">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-medium truncate">{skillInfo.label}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(item.created_at)}</span>
        </div>
        {item.product_name && (
          <p className="text-[10px] text-muted-foreground truncate">{item.product_name}</p>
        )}
      </div>
    </div>
  );
}

// ─── List Row ──────────────────────────────────────────

function ListRow({ item, expanded, onToggle }: { item: WarehouseItem; expanded: boolean; onToggle: () => void }) {
  const skillInfo = SKILL_LABEL[item.skill_id] || { label: item.skill_id, icon: FileText, color: "text-gray-600" };
  const SkillIcon = skillInfo.icon;
  const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const preview = getTextPreview(item.result);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <button
          className="w-full p-3 flex items-start gap-3 text-left hover:bg-muted/30 transition-colors"
          onClick={onToggle}
        >
          <SkillIcon className={cn("h-4 w-4 mt-0.5 shrink-0", skillInfo.color)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-medium">{skillInfo.label}</span>
              {item.product_name && (
                <span className="text-xs text-muted-foreground truncate">· {item.product_name}</span>
              )}
              <Badge variant="outline" className={cn("text-[9px] ml-auto shrink-0", statusInfo.color)}>
                {statusInfo.label}
              </Badge>
            </div>
            {preview && (
              <p className="text-xs text-muted-foreground line-clamp-1">{preview}</p>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground/60">{timeAgo(item.created_at)}</span>
              {item.source === "ops_task" && (
                <Badge variant="secondary" className="text-[9px]">自动执行</Badge>
              )}
            </div>
          </div>
          {item.image_url && (
            <img src={item.image_url} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
          )}
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0 mt-1" /> : <ChevronRight className="h-4 w-4 shrink-0 mt-1" />}
        </button>

        {expanded && item.result && (
          <div className="border-t px-3 py-3 bg-muted/20">
            <TaskResultRenderer
              taskType={item.skill_id}
              result={item.result}
              targetProductName={item.product_name}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────

export function AIProductionWarehouse() {
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "images" | "seo" | "pages" | "social">("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, images: 0 });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content-warehouse?filter=${filter}&limit=60`);
      const data = await res.json();
      setItems(data.items || []);
      setStats({ total: data.total_count || 0, images: data.images_count || 0 });
    } catch {
      toast.error("加载产出记录失败");
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const imageItems = items.filter((i) => i.has_image);
  const showGrid = viewMode === "grid" && (filter === "images" || imageItems.length > 0);

  return (
    <div className="space-y-4">
      {/* Header stats + controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>共 <strong className="text-foreground">{stats.total}</strong> 条产出</span>
          {stats.images > 0 && (
            <span className="flex items-center gap-1 text-pink-600">
              <ImageIcon className="h-3.5 w-3.5" />
              <strong>{stats.images}</strong> 张图片
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMode("list")}
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMode("grid")}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 ml-1" onClick={fetchItems}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "all" as const, label: "全部" },
          { key: "images" as const, label: "🎨 图片" },
          { key: "seo" as const, label: "🔍 SEO" },
          { key: "pages" as const, label: "📄 页面" },
          { key: "social" as const, label: "📱 社媒" },
        ]).map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-2">加载产出记录...</p>
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-2">
            <div className="text-4xl">🏭</div>
            <p className="text-sm font-medium">AI 产出仓库为空</p>
            <p className="text-xs text-muted-foreground">
              去运营驾驶舱执行任务，或在上方使用 Skill 手动生成内容，成果会出现在这里
            </p>
          </CardContent>
        </Card>
      ) : showGrid ? (
        /* Grid view for images */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(filter === "images" ? imageItems : items.filter((i) => i.has_image)).map((item) => (
            <ImageCard
              key={item.id}
              item={item}
              onExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          ))}
          {filter !== "images" && items.filter((i) => !i.has_image).map((item) => (
            <ListRow
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          ))}
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {items.map((item) => (
            <ListRow
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
