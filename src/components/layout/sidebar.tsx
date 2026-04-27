"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore, PLATFORM_ICONS, PLATFORM_COLORS } from "@/hooks/use-store";
import { getPendingCount } from "@/lib/supabase-approval";
import {
  Brain,
  ChevronLeft,
  ChevronDown,
  ChevronsUpDown,
  Plus,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PLATFORM_LABELS } from "@/lib/constants";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggle } = useSidebar();
  const { stores, currentStore, currentStoreId, switchStore, loading: storeLoading } = useStore();
  const [pendingCount, setPendingCount] = useState(0);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "当前店铺": true,
    "内容": false,
    "团队": false,
    "系统": false,
  });

  useEffect(() => {
    getPendingCount().then(setPendingCount).catch(() => {});
    const interval = setInterval(() => {
      getPendingCount().then(setPendingCount).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Group nav items
  const allGroups: Record<string, typeof NAV_ITEMS> = {};
  for (const item of NAV_ITEMS) {
    const group = item.group || "_ungrouped";
    if (!allGroups[group]) allGroups[group] = [];
    allGroups[group].push(item);
  }

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // Auto-open group containing active page
  useEffect(() => {
    for (const [group, items] of Object.entries(allGroups)) {
      if (items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))) {
        setOpenGroups((prev) => ({ ...prev, [group]: true }));
      }
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderNavLink = (item: (typeof NAV_ITEMS)[number]) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;

    const linkContent = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="truncate flex-1">{item.label}</span>
            {item.isNew && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 ml-auto">
                NEW
              </Badge>
            )}
            {item.href === "/approvals" && pendingCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
                {pendingCount}
              </span>
            )}
          </>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger render={<div />}>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
            {item.isNew && " ✨"}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.href}>{linkContent}</div>;
  };

  // ── Store Selector ──────────────────────────────────────
  const renderStoreSelector = () => {
    const icon = currentStore ? (PLATFORM_ICONS[currentStore.platform] || "🏪") : "🏪";
    const colorClass = currentStore ? (PLATFORM_COLORS[currentStore.platform] || "bg-gray-500") : "bg-muted";

    if (collapsed) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Tooltip>
              <TooltipTrigger render={<div />}>
                <button className="mx-auto flex h-9 w-9 items-center justify-center rounded-md hover:bg-sidebar-accent transition-colors">
                  <span className="text-base leading-none">{icon}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{currentStore?.name || "选择店铺"}</TooltipContent>
            </Tooltip>
          } />
          <DropdownMenuContent side="right" align="start" className="w-56">
            <DropdownMenuLabel>我的店铺</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {stores.map((store) => (
              <DropdownMenuItem key={store.id} onClick={() => switchStore(store.id)}>
                <span className={cn("flex h-5 w-5 items-center justify-center rounded text-white text-xs mr-2", PLATFORM_COLORS[store.platform] || "bg-gray-500")}>
                  {PLATFORM_ICONS[store.platform] || "🏪"}
                </span>
                <span className="flex-1 truncate">{store.name}</span>
                {store.id === currentStoreId && <Check className="h-3.5 w-3.5 text-primary ml-1" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Plus className="h-3.5 w-3.5 mr-2" />
              添加店铺
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <button className={cn(
            "flex w-full items-center gap-2.5 rounded-lg border border-sidebar-border px-3 py-2",
            "hover:bg-sidebar-accent transition-colors text-left",
            storeLoading && "opacity-60 pointer-events-none"
          )}>
            <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white text-sm", colorClass)}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate leading-tight">
                {currentStore?.name || (storeLoading ? "加载中..." : "选择店铺")}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 leading-tight">
                {currentStore ? (PLATFORM_LABELS[currentStore.platform] || currentStore.platform) : ""}
              </p>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40" />
          </button>
        } />
        <DropdownMenuContent side="bottom" align="start" className="w-60">
          <DropdownMenuLabel>我的店铺</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {stores.map((store) => (
            <DropdownMenuItem key={store.id} onClick={() => switchStore(store.id)}>
              <div className={cn("flex h-6 w-6 items-center justify-center rounded text-white text-xs shrink-0 mr-2", PLATFORM_COLORS[store.platform] || "bg-gray-500")}>
                {PLATFORM_ICONS[store.platform] || "🏪"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{store.name}</p>
                <p className="text-[10px] text-muted-foreground">{PLATFORM_LABELS[store.platform] || store.platform}</p>
              </div>
              {store.id === currentStoreId && <Check className="h-3.5 w-3.5 text-primary ml-2 shrink-0" />}
            </DropdownMenuItem>
          ))}
          {stores.length === 0 && !storeLoading && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              暂无店铺 — 去设置连接
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            添加店铺
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo + Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4 shrink-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Brain className="h-3.5 w-3.5" />
        </div>
        {!collapsed && (
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm">BrandMind</span>
            <Sparkles className="h-3 w-3 text-primary" />
          </div>
        )}
      </div>

      {/* Store Selector */}
      <div className={cn(
        "border-b border-border",
        collapsed ? "flex justify-center py-2" : "p-2"
      )}>
        {renderStoreSelector()}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {Object.entries(allGroups).map(([groupName, items]) => {
          if (groupName === "_ungrouped") {
            return (
              <div key={groupName} className="space-y-0.5">
                {items.map(renderNavLink)}
              </div>
            );
          }

          const isOpen = openGroups[groupName] ?? false;
          const hasActive = items.some(
            (item) => pathname === item.href || pathname.startsWith(item.href + "/")
          );

          if (collapsed) {
            return (
              <div key={groupName} className="space-y-0.5 py-1 border-t border-sidebar-border/40 first:border-t-0">
                {items.map(renderNavLink)}
              </div>
            );
          }

          return (
            <div key={groupName} className="space-y-0.5">
              <button
                onClick={() => toggleGroup(groupName)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors mt-2",
                  hasActive
                    ? "text-sidebar-foreground"
                    : "text-sidebar-foreground/40 hover:text-sidebar-foreground/60"
                )}
              >
                <ChevronDown
                  className={cn("h-3 w-3 transition-transform", !isOpen && "-rotate-90")}
                />
                <span>{groupName}</span>
              </button>
              {isOpen && (
                <div className="space-y-0.5 ml-1">
                  {items.map(renderNavLink)}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className="w-full justify-center"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>
    </aside>
  );
}
