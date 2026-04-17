export type Platform = 'tiktok' | 'instagram' | 'xiaohongshu' | 'amazon' | 'shopify' | 'independent';

export type TrendDirection = 'up' | 'down' | 'flat';

export type ContentStatus = 'draft' | 'pending' | 'published' | 'scheduled' | 'rejected';
export type ProductStatus = 'active' | 'inactive' | 'out_of_stock' | 'pending_review';
export type PostStatus = 'queued' | 'published' | 'failed' | 'draft';
export type SkillDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type SkillCategory = 'operations' | 'content' | 'seo' | 'ads' | 'service';

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface KPIData {
  label: string;
  value: string | number;
  previousValue?: string | number;
  trend: TrendDirection;
  trendPercent?: number;
  icon: string;
  format?: 'number' | 'currency' | 'percent';
  source?: 'shopify_live' | 'our_estimate' | 'needs_ga4' | 'all_accounts';
  sourceNote?: string;
}
