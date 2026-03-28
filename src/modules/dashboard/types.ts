import { Platform } from "@/lib/types";

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface PlatformSales {
  platform: Platform;
  name: string;
  revenue: number;
  percentage: number;
  fill: string;
}

export interface Activity {
  id: string;
  type: "content" | "order" | "review" | "trend" | "system";
  title: string;
  description: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  category: string;
}
