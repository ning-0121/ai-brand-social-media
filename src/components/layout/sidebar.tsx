"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { useSidebar } from "@/hooks/use-sidebar";
import { getPendingCount } from "@/lib/supabase-approval";
import { Brain, ChevronLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const [pendingCount, setPendingCount] = useState(0);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getPendingCount().then(setPendingCount).catch(() => {});
    const interval = setInterval(() => {
      getPendingCount().then(setPendingCount).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Split primary vs secondary
  const primaryItems = NAV_ITEMS.filter((item) => item.primary);
  const secondaryItems = NAV_ITEMS.filter((item) => !item.primary && item.group);

  // Group secondary items
  const secondaryGroups = secondaryItems.reduce((acc, item) => {
    const group = item.group!;
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, typeof NAV_ITEMS>);

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // Auto-open group if current page is inside it
  useEffect(() => {
    for (const [group, items] of Object.entries(secondaryGroups)) {
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
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && item.href === "/approvals" && pendingCount > 0 && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
            {pendingCount}
          </span>
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
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.href}>{linkContent}</div>;
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Brain className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm truncate">BrandMind AI</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {/* Primary items (always visible, no group header) */}
        <div className="space-y-0.5">
          {primaryItems.map(renderNavLink)}
        </div>

        {/* Secondary groups (collapsible) */}
        {Object.keys(secondaryGroups).length > 0 && (
          <>
            <Separator className="my-2" />
            {!collapsed && (
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/30">
                更多
              </div>
            )}
            {Object.entries(secondaryGroups).map(([groupName, items]) => {
              const isOpen = openGroups[groupName] || false;
              const hasActive = items.some(
                (item) => pathname === item.href || pathname.startsWith(item.href + "/")
              );

              if (collapsed) {
                // In collapsed mode, show first icon of each group with tooltip
                return items.map(renderNavLink);
              }

              return (
                <div key={groupName} className="mt-1">
                  <button
                    onClick={() => toggleGroup(groupName)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      hasActive
                        ? "text-sidebar-foreground"
                        : "text-sidebar-foreground/50 hover:text-sidebar-foreground/70"
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform",
                        !isOpen && "-rotate-90"
                      )}
                    />
                    <span>{groupName}</span>
                    <span className="ml-auto text-[10px] text-sidebar-foreground/30">
                      {items.length}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="space-y-0.5 ml-1">
                      {items.map(renderNavLink)}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className="w-full justify-center"
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>
    </aside>
  );
}
