import { TrendDirection } from "@/lib/types";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

interface TrendTagProps {
  direction: TrendDirection;
  value: number;
}

export function TrendTag({ direction, value }: TrendTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        direction === "up" && "text-emerald-500",
        direction === "down" && "text-destructive",
        direction === "flat" && "text-muted-foreground"
      )}
    >
      {direction === "up" && <ArrowUpRight className="h-3.5 w-3.5" />}
      {direction === "down" && <ArrowDownRight className="h-3.5 w-3.5" />}
      {direction === "flat" && <Minus className="h-3.5 w-3.5" />}
      {formatPercent(value)}
    </span>
  );
}
