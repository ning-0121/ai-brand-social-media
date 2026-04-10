import { BaseAgent } from "../base-agent";
import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import { generateImage } from "@/lib/image-service";


import type { AgentTask, AgentEvent, AgentCapability, AnalysisResult } from "../types";

export class CampaignAgent extends BaseAgent {
  readonly id = "campaign" as const;
  readonly name = "活动 Agent";
  readonly description = "一键生成活动全套素材包：着陆页+Banner+海报+社媒+邮件+广告+视频脚本";
  readonly capabilities: AgentCapability[] = [
    { task_type: "campaign_full_pack", name: "活动全套素材", description: "一键生成活动所有素材", auto_executable: false, estimated_duration_seconds: 120 },
    { task_type: "campaign_plan", name: "活动策划", description: "AI 制定活动方案", auto_executable: false, skill_id: "campaign_planner", estimated_duration_seconds: 30 },
    { task_type: "campaign_landing", name: "活动着陆页", description: "生成活动着陆页", auto_executable: false, skill_id: "landing_page", estimated_duration_seconds: 45 },
    { task_type: "campaign_poster", name: "活动海报", description: "生成活动海报", auto_executable: true, skill_id: "campaign_poster", estimated_duration_seconds: 25 },
    { task_type: "campaign_email", name: "活动邮件", description: "生成活动邮件", auto_executable: true, skill_id: "email_copy", estimated_duration_seconds: 25 },
  ];

  async analyze(): Promise<AnalysisResult> {
    const { data: campaigns } = await supabase.from("campaigns").select("id, name, status").eq("status", "planning");

    const tasks: AnalysisResult["suggested_tasks"] = [];
    for (const c of campaigns || []) {
      tasks.push({
        task_type: "campaign_full_pack",
        title: `为 ${c.name} 生成全套素材`,
        description: "着陆页+Banner+海报+社媒+邮件+广告",
        priority: "high",
        input: { campaign_id: c.id, campaign_name: c.name },
        requires_approval: true,
      });
    }

    return { suggested_tasks: tasks, summary: `${campaigns?.length || 0} 个活动待制作`, health_score: 50 };
  }

  async execute(task: AgentTask): Promise<AgentTask> {
    if (task.task_type === "campaign_full_pack") {
      const campaignName = (task.input.campaign_name as string) || task.title;
      const results: Record<string, unknown> = {};

      // 1. Landing page copy
      try {
        const { result } = await executeSkill("landing_page", {
          page_goal: "purchase",
          headline_idea: campaignName,
        }, { sourceModule: "campaign-agent" });
        results.landing_page = result.output;
      } catch (e) { results.landing_page_error = (e as Error).message; }

      // 2. Banner/poster
      try {
        const { result } = await executeSkill("campaign_poster", {
          campaign_theme: campaignName,
          template_id: "wide_banner",
        }, { sourceModule: "campaign-agent" });
        results.poster = result.output;

        // Generate actual image
        const prompt = ((result.output as Record<string, unknown>).background_prompt as string) || `Campaign banner for ${campaignName}, bold promotional design`;
        const imgUrl = await generateImage(prompt, { style: "social_media", size: "16:9" });
        results.banner_image = imgUrl;
      } catch (e) { results.poster_error = (e as Error).message; }

      // 3. Email
      try {
        const { result } = await executeSkill("email_copy", {
          email_type: "promotion",
          brand_name: "JOJOFEIFEI",
        }, { sourceModule: "campaign-agent" });
        results.email = result.output;
      } catch (e) { results.email_error = (e as Error).message; }

      // 4. Social post
      try {
        const { result } = await executeSkill("social_post_pack", {
          platform: "instagram",
        }, { sourceModule: "campaign-agent" });
        results.social = result.output;
      } catch (e) { results.social_error = (e as Error).message; }

      // Save creative project
      await supabase.from("creative_projects").insert({
        project_type: "campaign",
        title: `活动素材包: ${campaignName}`,
        status: "generated",
        generated_output: results,
        brief: task.input,
      });

      return { ...task, status: "completed", output: results };
    }

    const skillId = this.getSkillId(task.task_type);
    if (skillId) {
      const { result } = await executeSkill(skillId, task.input, { sourceModule: "campaign-agent" });
      return { ...task, status: "completed", output: result.output as Record<string, unknown> };
    }

    return { ...task, status: "failed", error: "Unknown task type" };
  }

  async onEvent(_e: AgentEvent): Promise<AgentTask[]> { void _e; return []; }
}
