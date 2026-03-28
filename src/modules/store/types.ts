import { BaseEntity, Platform, ProductStatus } from "@/lib/types";

export interface Product extends BaseEntity {
  name: string;
  sku: string;
  price: number;
  stock: number;
  status: ProductStatus;
  seo_score: number;
  category: string;
  platform: Platform;
}

export interface SEOScoreBreakdown {
  label: string;
  score: number;
  maxScore: number;
}

export interface SEOSuggestion {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  category: string;
}

export interface SEOScore {
  overall: number;
  breakdown: SEOScoreBreakdown[];
  suggestions: SEOSuggestion[];
}

export interface StoreHealthPoint {
  date: string;
  score: number;
}

export interface StoreHealth {
  currentScore: number;
  trend: StoreHealthPoint[];
}
