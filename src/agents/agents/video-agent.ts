import { BaseAgent } from "../base-agent";
import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import type { AgentTask, AgentEvent, AgentCapability, AnalysisResult } from "../types";

export class VideoAgent extends BaseAgent {
  readonly id = "video" as const;
  readonly name = "视频 Agent";
  readonly description = "生成短视频脚本、直播脚本、镜头拆解、字幕、封面";
  readonly capabilities: AgentCapability[] = [
    { task_type: "short_video", name: "短视频脚本", description: "TikTok/Reels/Shorts 脚本", auto_executable: true, skill_id: "short_video_script", estimated_duration_seconds: 30 },
    { task_type: "live_script", name: "直播脚本", description: "电商直播分镜脚本", auto_executable: true, skill_id: "live_stream_script", estimated_duration_seconds: 35 },
    { task_type: "video_edit_brief", name: "剪辑任务", description: "生成视频剪辑指令", auto_executable: true, estimated_duration_seconds: 20 },
  ];

  async analyze(): Promise<AnalysisResult> {
    const { data: products } = await supabase.from("products").select("id, name")
      .eq("platform", "shopify").not("shopify_product_id", "is", null).limit(3);

    const tasks: AnalysisResult["suggested_tasks"] = [];

    // Suggest TikTok videos for top products
    for (const p of (products || []).slice(0, 2)) {
      tasks.push({
        task_type: "short_video",
        title: `为 ${p.name} 制作 TikTok 脚本`,
        description: "30 秒短视频脚本",
        priority: "medium",
        input: { product: { id: p.id, name: p.name }, platform: "tiktok", duration: "30s" },
        requires_approval: false,
        target_module: "social",
      });
    }

    return { suggested_tasks: tasks, summary: `${tasks.length} 个视频任务建议`, health_score: 60 };
  }

  async execute(task: AgentTask): Promise<AgentTask> {
    const skillId = this.getSkillId(task.task_type);
    if (!skillId && task.task_type !== "video_edit_brief") {
      return { ...task, status: "failed", error: "Unknown task type" };
    }

    if (task.task_type === "video_edit_brief") {
      // Generate edit instructions from product info
      const { result } = await executeSkill("short_video_script", task.input, { sourceModule: "video-agent" });
      const script = result.output as Record<string, unknown>;

      const editBrief = {
        title: script.title || task.title,
        shots: script.scenes,
        music_suggestion: script.bgm_suggestion,
        editing_notes: [
          "剪辑节奏紧凑，每个镜头 2-3 秒",
          "添加字幕覆盖全程",
          "片头加品牌 logo 水印",
          "结尾加 CTA 卡片",
        ],
        export_formats: ["9:16 for TikTok", "1:1 for Instagram Feed", "16:9 for YouTube"],
      };

      await supabase.from("creative_projects").insert({
        project_type: "video",
        title: task.title,
        status: "generated",
        generated_output: editBrief,
        brief: task.input,
      });

      return { ...task, status: "completed", output: editBrief };
    }

    const { result } = await executeSkill(skillId!, task.input, { sourceModule: "video-agent" });

    await supabase.from("creative_projects").insert({
      project_type: "video",
      title: task.title,
      status: "generated",
      generated_output: result.output,
      brief: task.input,
    });

    return { ...task, status: "completed", output: result.output as Record<string, unknown> };
  }

  async onEvent(_e: AgentEvent): Promise<AgentTask[]> { void _e; return []; }
}
