"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { Brain } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function MobileNav() {
  const pathname = usePathname();

  const primaryItems = NAV_ITEMS.filter((item) => item.primary);
  const secondaryItems = NAV_ITEMS.filter((item) => !item.primary && item.group);

  const renderLink = (item: (typeof NAV_ITEMS)[number]) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Brain className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sm">BrandMind AI</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-0.5">
          {primaryItems.map(renderLink)}
        </div>
        {secondaryItems.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/30">
              更多功能
            </div>
            <div className="space-y-0.5">
              {secondaryItems.map(renderLink)}
            </div>
          </>
        )}
      </nav>
    </div>
  );
}
