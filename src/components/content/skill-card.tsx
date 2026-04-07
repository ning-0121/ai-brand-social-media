"use client";

import { cn } from "@/lib/utils";
import {
  Sparkles,
  FileText,
  Search,
  Home,
  Megaphone,
  Network,
  TrendingUp,
  Video,
  Calendar,
  Hash,
  Users,
  MessageSquare,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  FileText,
  Search,
  Home,
  Megaphone,
  Network,
  TrendingUp,
  Sparkles,
  Video,
  Calendar,
  Hash,
  Users,
  MessageSquare,
};

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  blue: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", ring: "ring-blue-500/30" },
  green: { bg: "bg-green-50 dark:bg-green-500/10", text: "text-green-600 dark:text-green-400", ring: "ring-green-500/30" },
  purple: { bg: "bg-purple-50 dark:bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", ring: "ring-purple-500/30" },
  red: { bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-600 dark:text-red-400", ring: "ring-red-500/30" },
  cyan: { bg: "bg-cyan-50 dark:bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", ring: "ring-cyan-500/30" },
  amber: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/30" },
  pink: { bg: "bg-pink-50 dark:bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", ring: "ring-pink-500/30" },
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", ring: "ring-indigo-500/30" },
  teal: { bg: "bg-teal-50 dark:bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", ring: "ring-teal-500/30" },
  violet: { bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", ring: "ring-violet-500/30" },
  orange: { bg: "bg-orange-50 dark:bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", ring: "ring-orange-500/30" },
  rose: { bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", ring: "ring-rose-500/30" },
};

interface SkillCardProps {
  name: string;
  icon: string;
  color: string;
  cost: number;
  selected: boolean;
  onClick: () => void;
}

export function SkillCard({ name, icon, color, cost, selected, onClick }: SkillCardProps) {
  const Icon = ICON_MAP[icon] || Sparkles;
  const colors = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start gap-1.5 rounded-lg border bg-card p-2.5 text-left transition-all hover:shadow-sm",
        selected ? cn("ring-2", colors.ring, "border-transparent") : "hover:border-foreground/20"
      )}
    >
      <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", colors.bg)}>
        <Icon className={cn("h-3.5 w-3.5", colors.text)} />
      </div>
      <p className="text-[11px] font-medium leading-tight line-clamp-2 min-h-[26px]">{name}</p>
      <span className="text-[9px] text-muted-foreground tabular-nums">~${cost.toFixed(2)}</span>
    </button>
  );
}
