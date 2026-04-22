import type { Playbook } from "./types";
import { productLaunchPlaybook } from "./playbooks/product-launch";
import { clearanceCampaignPlaybook } from "./playbooks/clearance-campaign";
import { storeOptimizationPlaybook } from "./playbooks/store-optimization";
import { weeklyContentPackPlaybook } from "./playbooks/weekly-content-pack";
import { trafficEngineSetupPlaybook } from "./playbooks/traffic-engine-setup";
import { conversionOverhaulPlaybook } from "./playbooks/conversion-overhaul";
import { campaignYearPlannerPlaybook } from "./playbooks/campaign-year-planner";

const playbooks: Playbook[] = [
  productLaunchPlaybook,
  clearanceCampaignPlaybook,
  storeOptimizationPlaybook,
  weeklyContentPackPlaybook,
  trafficEngineSetupPlaybook,
  conversionOverhaulPlaybook,
  campaignYearPlannerPlaybook,
];

const byId = new Map(playbooks.map(p => [p.id, p]));

export function getAllPlaybooks(): Playbook[] {
  return playbooks;
}

export function getPlaybook(id: string): Playbook | undefined {
  return byId.get(id);
}

export function getPlaybookMetadata() {
  return playbooks.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    objective: p.objective,
    when_to_use: p.when_to_use,
    category: p.category,
    icon: p.icon,
    color: p.color,
    estimated_duration_seconds: p.estimated_duration_seconds,
    step_count: p.steps.length,
    required_inputs: p.required_inputs,
  }));
}
