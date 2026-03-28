import { BaseEntity, Platform, PostStatus } from "@/lib/types";

export interface ScheduledPost extends BaseEntity {
  content: string;
  platform: Platform;
  scheduled_at: string;
  status: PostStatus;
  media_urls?: string[];
  hashtags?: string[];
}

export interface SocialAccount extends BaseEntity {
  platform: Platform;
  handle: string;
  display_name: string;
  avatar_url: string;
  followers: number;
  connected: boolean;
}

export interface EngagementData {
  date: string;
  tiktok: number;
  instagram: number;
  xiaohongshu: number;
}
