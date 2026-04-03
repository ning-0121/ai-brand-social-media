"use client";

import {
  Store,
  BarChart3,
  Megaphone,
  Share2,
  Target,
  Radar,
  Palette,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AGENT_ICONS: Record<string, LucideIcon> = {
  store_optimizer: Store,
  data_analyst: BarChart3,
  ad_manager: Megaphone,
  social_strategist: Share2,
  brand_strategist: Target,
  market_researcher: Radar,
  content_producer: Palette,
};

const AGENT_COLORS: Record<string, string> = {
  store_optimizer: "bg-emerald-500",
  data_analyst: "bg-indigo-500",
  ad_manager: "bg-amber-500",
  social_strategist: "bg-pink-500",
  brand_strategist: "bg-violet-500",
  market_researcher: "bg-sky-500",
  content_producer: "bg-orange-500",
};

const AGENT_NAMES: Record<string, string> = {
  store_optimizer: "店铺优化",
  data_analyst: "数据分析",
  ad_manager: "广告投放",
  social_strategist: "社媒策略",
  brand_strategist: "品牌策略",
  market_researcher: "市场调研",
  content_producer: "内容制作",
};

interface AgentAvatarProps {
  agentName: string;
  size?: "sm" | "md" | "lg";
  status?: "idle" | "busy" | "error" | "done";
  showLabel?: boolean;
  className?: string;
}

export function AgentAvatar({
  agentName,
  size = "md",
  status,
  showLabel = false,
  className,
}: AgentAvatarProps) {
  const Icon = AGENT_ICONS[agentName] || Radar;
  const color = AGENT_COLORS[agentName] || "bg-gray-500";
  const label = AGENT_NAMES[agentName] || agentName;

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };
  const iconSizes = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div
          className={cn(
            "flex items-center justify-center rounded-lg text-white",
            color,
            sizeClasses[size]
          )}
        >
          <Icon className={iconSizes[size]} />
        </div>
        {status && (
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
              status === "busy" && "bg-amber-500 animate-pulse",
              status === "done" && "bg-emerald-500",
              status === "error" && "bg-destructive",
              status === "idle" && "bg-muted-foreground/30"
            )}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
