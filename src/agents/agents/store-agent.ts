import { BaseAgent } from "../base-agent";
import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import { updateProductSEO } from "@/lib/shopify-operations";
import type { AgentTask, AgentEvent, AgentCapability, AnalysisResult } from "../types";

export class StoreAgent extends BaseAgent {
  readonly id = "store" as const;
  readonly name = "店铺优化 Agent";
  readonly description = "自动检查 SEO、详情页、库存、评论，发现问题并修复";
  readonly capabilities: AgentCapability[] = [
    { task_type: "seo_fix", name: "SEO 修复", description: "修复商品 meta_title/description", auto_executable: true, skill_id: "product_seo_optimize", estimated_duration_seconds: 20 },
    { task_type: "detail_page", name: "详情页优化", description: "优化商品 body_html", auto_executable: true, skill_id: "product_detail_page", estimated_duration_seconds: 30 },
    { task_type: "seo_audit", name: "SEO 审计", description: "全站 SEO 健康检查", auto_executable: true, estimated_duration_seconds: 30 },
    { task_type: "inventory_alert", name: "库存预警", description: "检查缺货和低库存", auto_executable: true, estimated_duration_seconds: 5 },
  ];

  async analyze(): Promise<AnalysisResult> {
    const { data: products } = await supabase.from("products").select("id, name, meta_title, meta_description, seo_score, stock_quantity, stock, shopify_product_id")
      .eq("platform", "shopify").not("shopify_product_id", "is", null);

    const tasks: AnalysisResult["suggested_tasks"] = [];

    for (const p of (products || []).slice(0, 10)) {
      if (!p.meta_title) {
        tasks.push({
          task_type: "seo_fix",
          title: `修复 ${p.name} 的 SEO 标题`,
          description: `商品缺少 meta_title`,
          priority: "high",
          input: { product: { id: p.id, name: p.name, shopify_product_id: p.shopify_product_id } },
          requires_approval: false,
          skill_id: "product_seo_optimize",
        });
      }
      if ((p.stock_quantity ?? p.stock ?? 0) === 0) {
        tasks.push({
          task_type: "inventory_alert",
          title: `${p.name} 库存为 0`,
          description: `商品缺货，需要补货或下架`,
          priority: "critical",
          input: { product_id: p.id, product_name: p.name },
          requires_approval: true,
        });
      }
    }

    const avgSeo = products?.length ? Math.round(products.reduce((s, p) => s + (p.seo_score || 0), 0) / products.length) : 0;

    return {
      suggested_tasks: tasks,
      summary: `${tasks.length} 个店铺问题需要处理，平均 SEO 分 ${avgSeo}`,
      health_score: avgSeo,
    };
  }

  async execute(task: AgentTask): Promise<AgentTask> {
    if (task.task_type === "seo_fix") {
      const product = task.input.product as Record<string, unknown>;
      if (!product?.id) return { ...task, status: "failed", error: "缺少商品" };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { result } = await executeSkill("product_seo_optimize", { product } as any, { sourceModule: "store-agent" });
      const seo = result.output as Record<string, unknown>;

      // Auto-deploy to Shopify
      const { data: integration } = await supabase.from("integrations").select("id").eq("platform", "shopify").eq("status", "active").maybeSingle();
      if (integration && product.shopify_product_id) {
        await updateProductSEO(integration.id, product.shopify_product_id as number, product.id as string, {
          meta_title: seo.meta_title as string,
          meta_description: seo.meta_description as string,
          tags: seo.tags as string,
        });
      }

      return { ...task, status: "completed", output: seo, execution_result: { deployed_to_shopify: !!integration } };
    }

    if (task.task_type === "inventory_alert") {
      return { ...task, status: "completed", output: { alert: "库存为 0，已标记" } };
    }

    return { ...task, status: "failed", error: "Unknown task type" };
  }

  async onEvent(_e: AgentEvent): Promise<AgentTask[]> { void _e;
    return [];
  }
}
