import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/constants";

const STATUS_VARIANTS: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  draft: "bg-muted text-muted-foreground border-border",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  pending_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  scheduled: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  queued: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  inactive: "bg-muted text-muted-foreground border-border",
  out_of_stock: "bg-destructive/10 text-destructive border-destructive/20",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium",
        STATUS_VARIANTS[status] || "bg-muted text-muted-foreground",
        className
      )}
    >
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}
