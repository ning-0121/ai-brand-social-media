"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Platform } from "@/lib/types";

interface ScheduledPost {
  id: string;
  title?: string;
  content_preview?: string;
  platform: string;
  scheduled_at: string;
  status: string;
}

interface ContentCalendarViewProps {
  posts: ScheduledPost[];
  onClickDate?: (date: string) => void;
  onClickPost?: (post: ScheduledPost) => void;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-blue-500",
  published: "bg-green-500",
  failed: "bg-red-500",
  draft: "bg-gray-400",
};

export function ContentCalendarView({ posts, onClickDate, onClickPost }: ContentCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];

    // Padding for start of month
    for (let i = 0; i < firstDay; i++) {
      const d = new Date(year, month, -firstDay + i + 1);
      days.push({
        date: d.toISOString().split("T")[0],
        day: d.getDate(),
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      days.push({
        date: dateObj.toISOString().split("T")[0],
        day: d,
        isCurrentMonth: true,
      });
    }

    // Padding for end of month (fill to 42 cells = 6 rows)
    while (days.length < 42) {
      const d = new Date(year, month + 1, days.length - firstDay - totalDays + 1);
      days.push({
        date: d.toISOString().split("T")[0],
        day: d.getDate(),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonth]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const post of posts) {
      if (!post.scheduled_at) continue;
      const date = post.scheduled_at.split("T")[0];
      const arr = map.get(date) || [];
      arr.push(post);
      map.set(date, arr);
    }
    return map;
  }, [posts]);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold">
          {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
        </h3>
        <Button variant="ghost" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {daysInMonth.map((cell, idx) => {
          const dayPosts = postsByDate.get(cell.date) || [];
          const isToday = cell.date === today;
          return (
            <div
              key={idx}
              className={cn(
                "bg-card min-h-[80px] p-1 cursor-pointer hover:bg-muted/50 transition-colors",
                !cell.isCurrentMonth && "opacity-40"
              )}
              onClick={() => onClickDate?.(cell.date)}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className={cn(
                    "text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full",
                    isToday && "bg-primary text-primary-foreground"
                  )}
                >
                  {cell.day}
                </span>
                {dayPosts.length === 0 && cell.isCurrentMonth && (
                  <Plus className="h-3 w-3 text-muted-foreground/30 hover:text-muted-foreground" />
                )}
              </div>
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map((post) => (
                  <button
                    key={post.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClickPost?.(post);
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-1 rounded px-1 py-0.5 text-[9px] bg-muted/50 hover:bg-muted truncate">
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_COLORS[post.status] || STATUS_COLORS.draft)} />
                      <PlatformIcon platform={post.platform as Platform} size="sm" />
                      <span className="truncate">{post.title || post.content_preview || post.platform}</span>
                    </div>
                  </button>
                ))}
                {dayPosts.length > 3 && (
                  <p className="text-[9px] text-muted-foreground pl-1">+{dayPosts.length - 3} 更多</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" />排队中</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" />已发布</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" />发布失败</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-400" />草稿</span>
      </div>
    </div>
  );
}
