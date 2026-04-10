import { BaseAgent } from "../base-agent";
import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import { generateImage } from "@/lib/image-service";
import { assembleBanner } from "@/lib/content-assembler";

import type { AgentTask, AgentEvent, AgentCapability, AnalysisResult } from "../types";

export class DesignAgent extends BaseAgent {
  readonly id = "design" as const;
  readonly name = "设计 Agent";
  readonly description = "生成 Banner、海报、社媒图片、广告图，支持多尺寸导出";
  readonly capabilities: AgentCapability[] = [
    { task_type: "generate_banner", name: "Banner 设计", description: "生成网站/活动 Banner", auto_executable: true, skill_id: "campaign_poster", estimated_duration_seconds: 30 },
    { task_type: "generate_poster", name: "海报设计", description: "生成促销/活动海报", auto_executable: true, skill_id: "campaign_poster", estimated_duration_seconds: 30 },
    { task_type: "generate_social_image", name: "社媒图片", description: "生成平台适配的社媒配图", auto_executable: true, skill_id: "social_media_image", estimated_duration_seconds: 25 },
    { task_type: "multi_size_export", name: "多尺寸导出", description: "一张图导出多个平台尺寸", auto_executable: true, estimated_duration_seconds: 60 },
  ];

  async analyze(): Promise<AnalysisResult> {
    // Check if there are campaigns needing design assets
    const { data: campaigns } = await supabase.from("campaigns").select("id, name, status")
      .eq("status", "planning").limit(3);

    const tasks: AnalysisResult["suggested_tasks"] = [];
    for (const c of campaigns || []) {
      tasks.push({
        task_type: "generate_banner",
        title: `为活动 ${c.name} 生成 Banner`,
        description: "活动策划中，需要 Banner",
        priority: "medium",
        input: { campaign_name: c.name, campaign_id: c.id },
        requires_approval: false,
      });
    }

    return { suggested_tasks: tasks, summary: `${tasks.length} 个设计任务`, health_score: 70 };
  }

  async execute(task: AgentTask): Promise<AgentTask> {
    const skillId = this.getSkillId(task.task_type);

    if (task.task_type === "multi_size_export" && task.input.image_prompt) {
      // Generate same image in multiple sizes
      const prompt = task.input.image_prompt as string;
      const sizes = (task.input.sizes as string[]) || ["1:1", "16:9", "9:16"];
      const results: Array<{ size: string; url: string | null }> = [];

      for (const size of sizes) {
        const url = await generateImage(prompt, { style: "social_media", size: size as "1:1" | "16:9" | "9:16" });
        results.push({ size, url });
      }

      await supabase.from("creative_projects").insert({
        project_type: "design",
        title: task.title,
        status: "exported",
        assets: results,
        brief: task.input,
      });

      return { ...task, status: "completed", output: { exports: results, count: results.filter(r => r.url).length } };
    }

    if (skillId) {
      const { result } = await executeSkill(skillId, task.input, { sourceModule: "design-agent" });
      const output = result.output as Record<string, unknown>;

      // Generate actual image if prompt available
      const imagePrompt = (output.background_prompt || output.image_prompt) as string;
      let imageUrl: string | null = null;
      if (imagePrompt) {
        imageUrl = await generateImage(imagePrompt, { style: "social_media", size: "16:9" });
      }

      // Build banner HTML
      const html = assembleBanner(
        output.headline as string || task.title,
        output.subheadline as string || "",
        output.cta as string || "Shop Now",
        imageUrl || undefined,
        output.backgroundColor as string
      );

      await supabase.from("creative_projects").insert({
        project_type: "design",
        title: task.title,
        status: "generated",
        generated_output: { ...output, image_url: imageUrl, html },
        brief: task.input,
      });

      return { ...task, status: "completed", output: { ...output, image_url: imageUrl, html } };
    }

    return { ...task, status: "failed", error: "Unknown task type" };
  }

  async onEvent(_e: AgentEvent): Promise<AgentTask[]> { void _e; return []; }
}
