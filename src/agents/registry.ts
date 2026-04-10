import type { BaseAgent } from "./base-agent";
import type { AgentId } from "./types";
import { TrendAgent } from "./agents/trend-agent";
import { ContentAgent } from "./agents/content-agent";
import { StoreAgent } from "./agents/store-agent";
import { SocialAgent } from "./agents/social-agent";
import { SupportAgent } from "./agents/support-agent";
import { AdsAgent } from "./agents/ads-agent";

const agents = new Map<AgentId, BaseAgent>();

// Lazy initialization
function initAgents() {
  if (agents.size > 0) return;
  agents.set("trend", new TrendAgent());
  agents.set("content", new ContentAgent());
  agents.set("store", new StoreAgent());
  agents.set("social", new SocialAgent());
  agents.set("support", new SupportAgent());
  agents.set("ads", new AdsAgent());
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
  return ["trend", "content", "store", "social", "support", "ads"];
}
