import { BaseEntity, ContentStatus, Platform } from "@/lib/types";

export interface ContentEngagement {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export type ContentType = "short_video" | "image_post" | "article" | "carousel" | "story" | "live";

export interface ContentItem extends BaseEntity {
  title: string;
  body: string;
  platform: Platform;
  content_type: ContentType;
  status: ContentStatus;
  engagement: ContentEngagement;
  tags: string[];
  scheduled_at: string | null;
  published_at: string | null;
}

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  platform: Platform;
  content_type: ContentType;
  tone: string;
  structure: string;
  example_tags: string[];
}
