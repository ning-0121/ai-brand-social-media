"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell, AlertCircle, ClipboardCheck, Activity } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: "approval" | "failure" | "ops";
  title: string;
  description: string;
  timestamp: string;
  href?: string;
}

const TYPE_CONFIG = {
  approval: { icon: ClipboardCheck, color: "text-amber-500", dot: "bg-amber-500" },
  failure: { icon: AlertCircle, color: "text-red-500", dot: "bg-red-500" },
  ops: { icon: Activity, color: "text-blue-500", dot: "bg-blue-500" },
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

export function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Silent — notification fetch failure should not block user
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Mark all as read when dropdown opens
  useEffect(() => {
    if (open) {
      setUnreadCount(0);
    }
  }, [open]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button className="relative rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-semibold">通知中心</span>
          <span className="text-xs text-muted-foreground">
            最近 24 小时
          </span>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              暂无通知
            </div>
          ) : (
            items.map((item) => {
              const config = TYPE_CONFIG[item.type];
              const Icon = config.icon;

              const content = (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0"
                >
                  <div className={cn("mt-0.5", config.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{item.title}</span>
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full", config.dot)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {item.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {timeAgo(item.timestamp)}
                    </p>
                  </div>
                </div>
              );

              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                  >
                    {content}
                  </Link>
                );
              }
              return content;
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
