import { BaseAgent } from "../base-agent";
import { supabase } from "@/lib/supabase";
import { editImage, IMAGE_EDIT_PRESETS } from "@/lib/image-editor";
import type { AgentTask, AgentEvent, AgentCapability, AnalysisResult } from "../types";

export class ImageEditAgent extends BaseAgent {
  readonly id = "image_edit" as const;
  readonly name = "图片编辑 Agent";
  readonly description = "AI 修图：换背景、调色、裁切、去杂物、批量多尺寸、风格统一";
  readonly capabilities: AgentCapability[] = [
    { task_type: "edit_image", name: "修改图片", description: "根据指令修改图片（保留原图）", auto_executable: true, estimated_duration_seconds: 20 },
    { task_type: "batch_resize", name: "批量裁切", description: "一张图裁切为多个平台尺寸", auto_executable: true, estimated_duration_seconds: 40 },
    { task_type: "style_unify", name: "风格统一", description: "批量处理多张图片为统一风格", auto_executable: true, estimated_duration_seconds: 60 },
  ];

  async analyze(): Promise<AnalysisResult> {
    // Check media library for images that could be optimized
    const { data: media } = await supabase.from("media_library").select("id, filename, category")
      .eq("source", "upload").limit(5);

    return {
      suggested_tasks: [],
      summary: `素材库有 ${media?.length || 0} 张上传图片可编辑`,
      health_score: 80,
    };
  }

  async execute(task: AgentTask): Promise<AgentTask> {
    if (task.task_type === "edit_image") {
      const imageUrl = task.input.image_url as string;
      const editPrompt = task.input.edit_prompt as string;
      const preset = task.input.preset as string;

      if (!imageUrl) return { ...task, status: "failed", error: "缺少图片 URL" };

      const finalPrompt = preset
        ? IMAGE_EDIT_PRESETS[preset as keyof typeof IMAGE_EDIT_PRESETS] || editPrompt
        : editPrompt;

      if (!finalPrompt) return { ...task, status: "failed", error: "缺少编辑指令" };

      const result = await editImage(imageUrl, finalPrompt);

      if (!result.url) return { ...task, status: "failed", error: result.error || "修图失败" };

      // Save to media library
      await supabase.from("media_library").insert({
        filename: `edited-${Date.now()}.png`,
        original_url: result.url,
        media_type: "image",
        source: "ai_edited",
        parent_id: task.input.media_id as string || null,
        ai_edit_prompt: finalPrompt,
        tags: ["ai-edited"],
      });

      return { ...task, status: "completed", output: { edited_url: result.url, original_preserved: true } };
    }

    if (task.task_type === "batch_resize") {
      const imageUrl = task.input.image_url as string;
      if (!imageUrl) return { ...task, status: "failed", error: "缺少图片" };

      const presets = ["crop_square", "crop_portrait", "crop_story"];
      const results: Array<{ preset: string; url?: string }> = [];

      for (const p of presets) {
        const r = await editImage(imageUrl, IMAGE_EDIT_PRESETS[p as keyof typeof IMAGE_EDIT_PRESETS]);
        results.push({ preset: p, url: r.url });
      }

      return { ...task, status: "completed", output: { versions: results, count: results.filter(r => r.url).length } };
    }

    return { ...task, status: "failed", error: "Unknown task type" };
  }

  async onEvent(_e: AgentEvent): Promise<AgentTask[]> { void _e; return []; }
}
