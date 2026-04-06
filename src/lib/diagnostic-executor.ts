import { supabase } from "./supabase";
import { createApprovalTask } from "./supabase-approval";
import type { DiagnosticFinding } from "./diagnostic-types";

export async function executeFinding(
  findingId: string
): Promise<{ type: "approval_task" | "workflow_instance"; id: string }> {
  // 1. 加载 finding
  const { data: finding, error } = await supabase
    .from("diagnostic_findings")
    .select("*")
    .eq("id", findingId)
    .single();

  if (error || !finding) {
    throw new Error(`找不到诊断发现: ${findingId}`);
  }

  const f = finding as DiagnosticFinding;
  const action = f.recommended_action;

  if (action.action_type === "info_only") {
    throw new Error("此发现仅供参考，无法自动执行");
  }

  let ref: { type: "approval_task" | "workflow_instance"; id: string };

  if (action.action_type === "workflow_launch") {
    // 创建工作流实例 (通过现有 workflow API)
    // 简化处理：对于 workflow 类型，创建一个审批任务让用户确认后手动触发
    const approval = await createApprovalTask({
      type: mapActionToApprovalType(action.action_type),
      entity_id: f.affected_entities[0]?.entity_id,
      entity_type: "product",
      title: `[诊断] ${f.title}`,
      description: `${f.description}\n\n建议操作: ${action.display_label}\n影响商品: ${f.affected_entities.map((e) => e.name).join(", ")}`,
      payload: {
        diagnostic_finding_id: f.id,
        action_type: action.action_type,
        workflow_template: action.workflow_template,
        affected_entities: f.affected_entities,
      },
    });

    ref = { type: "approval_task", id: approval.id };
  } else {
    // SEO / 商品 / 库存类型 → 创建审批任务
    const firstEntity = f.affected_entities[0];
    const approval = await createApprovalTask({
      type: mapActionToApprovalType(action.action_type),
      entity_id: firstEntity?.entity_id,
      entity_type: firstEntity?.entity_type || "product",
      title: `[诊断] ${f.title}`,
      description: `${f.description}\n\n影响商品: ${f.affected_entities.map((e) => e.name).join(", ")}`,
      payload: {
        diagnostic_finding_id: f.id,
        action_type: action.action_type,
        agent_name: action.agent_name,
        task_type: action.task_type,
        affected_entities: f.affected_entities,
        shopify_product_id: firstEntity?.shopify_product_id,
      },
    });

    ref = { type: "approval_task", id: approval.id };
  }

  // 2. 更新 finding 状态
  await supabase
    .from("diagnostic_findings")
    .update({
      status: "in_progress",
      execution_ref: ref,
      updated_at: new Date().toISOString(),
    })
    .eq("id", findingId);

  return ref;
}

export async function dismissFinding(findingId: string): Promise<void> {
  await supabase
    .from("diagnostic_findings")
    .update({
      status: "dismissed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", findingId);
}

function mapActionToApprovalType(actionType: string): string {
  switch (actionType) {
    case "seo_update":
      return "seo_update";
    case "product_edit":
      return "product_edit";
    case "inventory_update":
      return "inventory_update";
    case "content_publish":
      return "content_publish";
    case "workflow_launch":
      return "seo_update"; // workflow 也通过审批触发
    default:
      return "product_edit";
  }
}
