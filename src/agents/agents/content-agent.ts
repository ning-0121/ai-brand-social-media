import { BaseAgent } from "../base-agent";
import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import type { AgentTask, AgentEvent, AgentCapability, AnalysisResult } from "../types";

export class ContentAgent extends BaseAgent {
  readonly id = "content" as const;
  readonly name = "内容制作 Agent";
  readonly description = "自动制作商品详情页、社媒帖子、广告创意、活动页面";
  readonly capabilities: AgentCapability[] = [
    { task_type: "detail_page", name: "详情页制作", description: "生成完整商品详情页", auto_executable: true, skill_id: "product_detail_page", estimated_duration_seconds: 30 },
    { task_type: "social_post", name: "社媒帖子", description: "生成社媒帖子包（3角度）", auto_executable: true, skill_id: "social_post_pack", estimated_duration_seconds: 30 },
    { task_type: "ad_creative", name: "广告创意", description: "生成广告创意变体", auto_executable: false, skill_id: "ad_creative_generator", estimated_duration_seconds: 30 },
    { task_type: "landing_page", name: "落地页", description: "生成活动落地页", auto_executable: false, skill_id: "landing_page", estimated_duration_seconds: 40 },
    { task_type: "email_copy", name: "邮件文案", description: "生成营销邮件", auto_executable: true, skill_id: "email_copy", estimated_duration_seconds: 25 },
    { task_type: "video_script", name: "视频脚本", description: "生成短视频/直播脚本", auto_executable: true, skill_id: "short_video_script", estimated_duration_seconds: 30 },
  ];

  async analyze(): Promise<AnalysisResult> {
    // Find products without content
    const { data: products } = await supabase.from("products").select("id, name, body_html, meta_title")
      .eq("platform", "shopify").not("shopify_product_id", "is", null);
    const { data: contents } = await supabase.from("contents").select("title");

    const tasks: AnalysisResult["suggested_tasks"] = [];
    const contentTitles = (contents || []).map((c) => c.title?.toLowerCase() || "");

    for (const p of (products || []).slice(0, 5)) {
      const hasContent = contentTitles.some((t) => t.includes(p.name.toLowerCase()));
      if (!hasContent) {
        tasks.push({
          task_type: "social_post",
          title: `为 ${p.name} 创建社媒推广`,
          description: `商品缺少社媒推广内容`,
          priority: "medium",
          input: { product: { id: p.id, name: p.name }, platform: "instagram" },
          requires_approval: false,
          target_module: "social",
          skill_id: "social_post_pack",
        });
      }
    }

    return {
      suggested_tasks: tasks,
      summary: `${tasks.length} 个商品需要内容制作`,
      health_score: products?.length ? Math.round(((products.length - tasks.length) / products.length) * 100) : 50,
    };
  }

  async execute(task: AgentTask): Promise<AgentTask> {
    const skillId = this.getSkillId(task.task_type);
    if (!skillId) return { ...task, status: "failed", error: "Unknown task type" };

    const { result } = await executeSkill(skillId, task.input, { sourceModule: "content-agent" });
    return { ...task, status: "completed", output: result.output as Record<string, unknown> };
  }

  async onEvent(event: AgentEvent): Promise<AgentTask[]> {
    // React to trend opportunities → create content
    if (event.type === "trend_scan.completed" && event.payload.output) {
      return [{
        id: "",
        agent_id: "content",
        task_type: "social_post",
        title: `趋势内容: ${(event.payload.output as Record<string, unknown>).product_name || "热门商品"}`,
        description: "基于趋势洞察自动创建内容",
        status: "pending",
        priority: "medium",
        input: event.payload,
        source_module: "trend",
        target_module: "social",
        requires_approval: false,
        created_at: new Date().toISOString(),
      }];
    }
    return [];
  }
}
