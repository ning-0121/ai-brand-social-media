import type { BaseAgent } from "./base-agent";
import type { AgentId } from "./types";
import { TrendAgent } from "./agents/trend-agent";
import { ContentAgent } from "./agents/content-agent";
import { StoreAgent } from "./agents/store-agent";
import { SocialAgent } from "./agents/social-agent";
import { SupportAgent } from "./agents/support-agent";
import { AdsAgent } from "./agents/ads-agent";
import { PageAgent } from "./agents/page-agent";
import { DesignAgent } from "./agents/design-agent";
import { ImageEditAgent } from "./agents/image-edit-agent";
import { VideoAgent } from "./agents/video-agent";
import { CampaignAgent } from "./agents/campaign-agent";

const agents = new Map<AgentId, BaseAgent>();

function initAgents() {
  if (agents.size > 0) return;
  // Core agents
  agents.set("trend", new TrendAgent());
  agents.set("content", new ContentAgent());
  agents.set("store", new StoreAgent());
  agents.set("social", new SocialAgent());
  agents.set("support", new SupportAgent());
  agents.set("ads", new AdsAgent());
  // Creative Studio agents
  agents.set("page", new PageAgent());
  agents.set("design", new DesignAgent());
  agents.set("image_edit", new ImageEditAgent());
  agents.set("video", new VideoAgent());
  agents.set("campaign", new CampaignAgent());
}

export function getAgent(id: string): BaseAgent | undefined {
  initAgents();
  return agents.get(id as AgentId);
}

export function getAllAgents(): BaseAgent[] {
  initAgents();
  return Array.from(agents.values());
}

export function getAgentIds(): AgentId[] {
  return ["trend", "content", "store", "social", "support", "ads", "page", "design", "image_edit", "video", "campaign"];
}
