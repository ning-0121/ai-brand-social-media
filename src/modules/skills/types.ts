import { BaseEntity, SkillCategory, SkillDifficulty } from "@/lib/types";

export interface SOPStep {
  id: string;
  order: number;
  title: string;
  description: string;
  tips?: string;
  estimated_minutes?: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  variables: string[];
  category: SkillCategory;
}

export interface SkillPack extends BaseEntity {
  title: string;
  description: string;
  category: SkillCategory;
  difficulty: SkillDifficulty;
  icon: string;
  usage_count: number;
  is_learned: boolean;
  tags: string[];
  sop_steps?: SOPStep[];
  prompt_templates?: PromptTemplate[];
}
