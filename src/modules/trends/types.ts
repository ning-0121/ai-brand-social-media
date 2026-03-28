import { BaseEntity, Platform, TrendDirection } from "@/lib/types";

export interface HotProduct extends BaseEntity {
  name: string;
  platform: Platform;
  category: string;
  sales_volume: number;
  growth_rate: number;
  trend: TrendDirection;
  price_range: string;
  rating: number;
  image_url?: string;
}

export interface CategoryTrend {
  date: string;
  美妆护肤: number;
  家居生活: number;
  数码科技: number;
  食品饮料: number;
}

export interface Competitor {
  id: string;
  name: string;
  platform: Platform;
  followers: number;
  avg_engagement: number;
  growth_rate: number;
  trend: TrendDirection;
  top_category: string;
  recent_campaigns: number;
}
