import { supabase } from "../supabase";
import { getSkill } from "./registry";
import type { SkillInputData, SkillContext, SkillResult } from "./types";

export async function executeSkill(
  skillId: string,
  inputs: SkillInputData,
  options?: {
    sourceModule?: string;
    sourceRef?: Record<string, unknown>;
    productId?: string;
    productName?: string;
  }
): Promise<{ task_id: string; result: SkillResult }> {
  const skill = getSkill(skillId);
  if (!skill) throw new Error(`未找到 Skill: ${skillId}`);

  // 创建 content_task 记录
  const { data: task, error: createErr } = await supabase
    .from("content_tasks")
    .insert({
      skill_id: skillId,
      product_id: options?.productId || null,
      product_name: options?.productName || null,
      source_module: options?.sourceModule || "manual",
      source_ref: options?.sourceRef || null,
      inputs,
      status: "running",
    })
    .select()
    .single();

  if (createErr || !task) {
    throw new Error(`创建任务失败: ${createErr?.message}`);
  }

  try {
    // 加载上下文
    const context = await loadContext();

    // 执行 Skill
    const result = await skill.execute(inputs, context);

    // 更新任务状态
    await supabase
      .from("content_tasks")
      .update({
        status: "completed",
        result,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    // 更新 skill 使用次数
    await supabase
      .from("content_skills")
      .update({ usage_count: 1 })
      .eq("id", skillId);

    const { logAudit } = await import("@/lib/audit-logger");
    logAudit({
      actorType: "agent",
      sourceAgent: "content_skills",
      actionType: `skill.execute.${skillId}`,
      targetType: "content_task",
      targetId: task.id,
      requestPayload: inputs as Record<string, unknown>,
      status: "success",
    });

    return { task_id: task.id, result };
  } catch (err) {
    await supabase
      .from("content_tasks")
      .update({
        status: "failed",
        result: { error: err instanceof Error ? err.message : "执行失败" },
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    const { logAudit } = await import("@/lib/audit-logger");
    logAudit({
      actorType: "agent",
      sourceAgent: "content_skills",
      actionType: `skill.execute.${skillId}`,
      targetType: "content_task",
      targetId: task.id,
      status: "failed",
      error: err instanceof Error ? err.message : "执行失败",
    });

    throw err;
  }
}

async function loadContext(): Promise<SkillContext> {
  // 从品牌策略表加载品牌信息
  const context: SkillContext = {};

  try {
    // 加载竞品 (前 3 个)
    const { data: competitors } = await supabase
      .from("competitors")
      .select("name, monthly_sales, rating")
      .order("monthly_sales", { ascending: false })
      .limit(3);
    if (competitors) context.competitors = competitors;

    // 加载热门趋势
    const { data: trends } = await supabase
      .from("hot_products")
      .select("name, category, growth_rate")
      .order("growth_rate", { ascending: false })
      .limit(5);
    if (trends) context.trends = trends;
  } catch {
    // 上下文加载失败不影响 Skill 执行
  }

  return context;
}
