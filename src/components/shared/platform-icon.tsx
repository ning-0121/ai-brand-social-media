import { Platform } from "@/lib/types";
import { PLATFORM_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PLATFORM_COLORS: Record<Platform, string> = {
  tiktok: "bg-black text-white dark:bg-white dark:text-black",
  instagram: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white",
  xiaohongshu: "bg-red-500 text-white",
  amazon: "bg-orange-400 text-white",
  shopify: "bg-green-600 text-white",
  independent: "bg-blue-500 text-white",
};

const PLATFORM_LETTERS: Record<Platform, string> = {
  tiktok: "TK",
  instagram: "IG",
  xiaohongshu: "XH",
  amazon: "AZ",
  shopify: "SP",
  independent: "DL",
};

interface PlatformIconProps {
  platform: Platform;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function PlatformIcon({ platform, size = "sm", showLabel }: PlatformIconProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center justify-center rounded font-bold",
          PLATFORM_COLORS[platform],
          size === "sm" ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]"
        )}
      >
        {PLATFORM_LETTERS[platform]}
      </span>
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {PLATFORM_LABELS[platform]}
        </span>
      )}
    </span>
  );
}
