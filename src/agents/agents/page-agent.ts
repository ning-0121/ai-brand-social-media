import { BaseAgent } from "../base-agent";
import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import { generateImage } from "@/lib/image-service";
import { assembleDetailPage } from "@/lib/content-assembler";
import { updateProductBodyHtml, updateProductSEO, createShopifyPage } from "@/lib/shopify-operations";
import type { AgentTask, AgentEvent, AgentCapability, AnalysisResult } from "../types";

export class PageAgent extends BaseAgent {
  readonly id = "page" as const;
  readonly name = "页面生成 Agent";
  readonly description = "生成商品详情页、活动承接页、首页模块、FAQ 页面，组装完整 HTML 并部署";
  readonly capabilities: AgentCapability[] = [
    { task_type: "generate_detail_page", name: "商品详情页", description: "生成完整详情页（文案+图片+组装+部署）", auto_executable: true, skill_id: "product_detail_page", estimated_duration_seconds: 45 },
    { task_type: "generate_landing_page", name: "活动承接页", description: "生成活动/营销着陆页", auto_executable: false, skill_id: "landing_page", estimated_duration_seconds: 45 },
    { task_type: "generate_homepage_hero", name: "首页 Hero", description: "生成首页 Hero 区域", auto_executable: false, skill_id: "homepage_hero", estimated_duration_seconds: 30 },
    { task_type: "generate_faq", name: "FAQ 页面", description: "为商品生成常见问题", auto_executable: true, estimated_duration_seconds: 20 },
  ];

  async analyze(): Promise<AnalysisResult> {
    const { data: products } = await supabase.from("products").select("id, name, body_html, shopify_product_id")
      .eq("platform", "shopify").not("shopify_product_id", "is", null);

    const tasks: AnalysisResult["suggested_tasks"] = [];
    for (const p of (products || []).slice(0, 3)) {
      if (!p.body_html || p.body_html.length < 200) {
        tasks.push({
          task_type: "generate_detail_page",
          title: `优化 ${p.name} 详情页`,
          description: `详情页内容不足 200 字，需要完整重写`,
          priority: "high",
          input: { product_id: p.id, product_name: p.name, shopify_product_id: p.shopify_product_id },
          requires_approval: false,
          target_module: "store",
        });
      }
    }

    return { suggested_tasks: tasks, summary: `${tasks.length} 个商品详情页需优化`, health_score: 50 };
  }

  async execute(task: AgentTask): Promise<AgentTask> {
    if (task.task_type === "generate_detail_page") {
      const productId = task.input.product_id as string;
      const { data: product } = await supabase.from("products").select("*").eq("id", productId).single();
      if (!product) return { ...task, status: "failed", error: "商品不存在" };

      // 1. Generate copy
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { result } = await executeSkill("product_detail_page", { product } as any, { sourceModule: "page-agent" });
      const copy = result.output as Record<string, unknown>;

      // 2. Generate lifestyle image
      const imgUrl = await generateImage(
        `Professional lifestyle photo of ${product.name}, activewear, model wearing, natural lighting`,
        { style: "lifestyle", size: "16:9" }
      );

      // 3. Assemble HTML
      const html = assembleDetailPage(
        {
          title: copy.title as string || product.name,
          subtitle: copy.subtitle as string,
          highlights: copy.highlights as string[],
          description: copy.description as string,
          specs: copy.specs as Array<{ name: string; value: string }>,
          cta_primary: copy.cta_primary as string,
        },
        product.image_url,
        imgUrl ? [{ label: "lifestyle", url: imgUrl }] : []
      );

      // 4. Deploy
      const { data: integration } = await supabase.from("integrations").select("id").eq("platform", "shopify").eq("status", "active").maybeSingle();
      if (integration && product.shopify_product_id) {
        await updateProductBodyHtml(integration.id, product.shopify_product_id, product.id, html);
        if (copy.meta_title) {
          await updateProductSEO(integration.id, product.shopify_product_id, product.id, {
            meta_title: copy.meta_title as string,
            meta_description: copy.meta_description as string,
          });
        }
      }

      // 5. Save as creative project
      await supabase.from("creative_projects").insert({
        project_type: "page",
        title: `详情页: ${product.name}`,
        status: "published",
        product_id: product.id,
        product_name: product.name,
        generated_output: copy,
        seo: { meta_title: copy.meta_title, meta_description: copy.meta_description, tags: copy.tags },
      });

      return { ...task, status: "completed", output: copy, execution_result: { deployed: true, html_length: html.length, has_image: !!imgUrl } };
    }

    if (task.task_type === "generate_landing_page") {
      const { result } = await executeSkill("landing_page", task.input, { sourceModule: "page-agent" });
      const { data: integration } = await supabase.from("integrations").select("id").eq("platform", "shopify").eq("status", "active").maybeSingle();

      if (integration && result.output) {
        const html = (result.output as Record<string, unknown>).body_html as string;
        if (html) {
          await createShopifyPage(integration.id, task.title, html);
        }
      }

      return { ...task, status: "completed", output: result.output as Record<string, unknown> };
    }

    const skillId = this.getSkillId(task.task_type);
    if (skillId) {
      const { result } = await executeSkill(skillId, task.input, { sourceModule: "page-agent" });
      return { ...task, status: "completed", output: result.output as Record<string, unknown> };
    }

    return { ...task, status: "failed", error: "Unknown task type" };
  }

  async onEvent(_e: AgentEvent): Promise<AgentTask[]> { void _e; return []; }
}
