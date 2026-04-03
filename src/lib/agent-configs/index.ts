import type { AgentConfigMap } from "../agent-types";
import { storeOptimizerConfig } from "./store-optimizer";
import { dataAnalystConfig } from "./data-analyst";
import { adManagerConfig } from "./ad-manager";
import { socialStrategistConfig } from "./social-strategist";
import { brandStrategistConfig } from "./brand-strategist";
import { marketResearcherConfig } from "./market-researcher";
import { contentProducerConfig } from "./content-producer";

const agentConfigs: Record<string, AgentConfigMap> = {
  store_optimizer: storeOptimizerConfig,
  data_analyst: dataAnalystConfig,
  ad_manager: adManagerConfig,
  social_strategist: socialStrategistConfig,
  brand_strategist: brandStrategistConfig,
  market_researcher: marketResearcherConfig,
  content_producer: contentProducerConfig,
};

export function getAgentConfigs(agentName: string): AgentConfigMap {
  const config = agentConfigs[agentName];
  if (!config) throw new Error(`未找到 Agent 配置: ${agentName}`);
  return config;
}
