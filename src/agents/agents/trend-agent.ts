import { BaseAgent } from "../base-agent";
import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import type { AgentTask, AgentEvent, AgentCapability, AnalysisResult } from "../types";

export class TrendAgent extends BaseAgent {
  readonly id = "trend" as const;
  readonly name = "趋势洞察 Agent";
  readonly description = "扫描市场趋势、竞品动态，发现商机并联动其他 Agent";
  readonly capabilities: AgentCapability[] = [
    { task_type: "trend_scan", name: "趋势扫描", description: "扫描热门品类和增长趋势", auto_executable: true, skill_id: "product_research", estimated_duration_seconds: 30 },
    { task_type: "competitor_scan", name: "竞品分析", description: "深度分析竞品策略", auto_executable: true, skill_id: "competitor_deep_analysis", estimated_duration_seconds: 30 },
    { task_type: "pricing_analysis", name: "定价分析", description: "分析竞品价格带，建议定价", auto_executable: true, skill_id: "pricing_analysis", estimated_duration_seconds: 25 },
  ];

  async analyze(): Promise<AnalysisResult> {
    const { data: hotProducts } = await supabase.from("hot_products").select("*").eq("trend", "up").order("growth_rate", { ascending: false }).limit(5);
    const { data: competitors } = await supabase.from("competitors").select("*").order("growth_rate", { ascending: false }).limit(3);

    const tasks: AnalysisResult["suggested_tasks"] = [];

    // High-growth competitors need watching
    for (const c of competitors || []) {
      if (c.growth_rate > 20) {
        tasks.push({
          task_type: "competitor_scan",
          title: `分析竞品 ${c.name} (增长 ${c.growth_rate}%)`,
          description: `竞品 ${c.name} 增长率 ${c.growth_rate}%，需要深度分析其策略`,
          priority: c.growth_rate > 50 ? "high" : "medium",
          input: { competitor_name: c.name, competitor_url: c.url },
          requires_approval: false,
          target_module: "content",
        });
      }
    }

    // Hot trending products → suggest content creation
    for (const hp of (hotProducts || []).slice(0, 2)) {
      tasks.push({
        task_type: "trend_scan",
        title: `热门趋势: ${hp.name} (增长 ${hp.growth_rate}%)`,
        description: `${hp.category} 品类热门商品，建议创建相关内容`,
        priority: "medium",
        input: { product_name: hp.name, category: hp.category },
        requires_approval: false,
        target_module: "content",
      });
    }

    return {
      suggested_tasks: tasks,
      summary: `发现 ${tasks.length} 个市场机会`,
      health_score: Math.min(100, 50 + (hotProducts?.length || 0) * 10),
    };
  }

  async execute(task: AgentTask): Promise<AgentTask> {
    const skillId = this.getSkillId(task.task_type);
    if (!skillId) return { ...task, status: "failed", error: "Unknown task type" };

    const { result } = await executeSkill(skillId, task.input, { sourceModule: "trend-agent" });
    return { ...task, status: "completed", output: result.output as Record<string, unknown> };
  }

  async onEvent(_e: AgentEvent): Promise<AgentTask[]> { void _e;
    // Trend agent doesn't react to other agents' events
    return [];
  }
}
