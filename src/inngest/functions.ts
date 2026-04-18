/**
 * Inngest 函数：把串行 pipeline 改成 DAG
 *
 * 好处：
 * - 每一步（step.run）独立重试，节点失败只重跑这一步
 * - 突破 Vercel 单函数 60s 限制：step 之间隔开，Inngest 会分多次调用
 * - 每步结果被持久化，重试时跳过已完成节点
 * - 可并行 fan-out（Promise.all 内 step.run）
 *
 * 启用：需在 Vercel 配置 INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY
 *        (inngest.com 注册免费账号，Hobby 档每月 50k 步够用)
 */

import { inngest } from "./client";
import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import { updateProductSEO, updateProductBodyHtml } from "@/lib/shopify-operations";
import { generateImages } from "@/lib/image-service";
import { assembleDetailPage } from "@/lib/content-assembler";
import { reviewContent } from "@/lib/content-qa";

/**
 * 商品完整内容 DAG
 *
 *        ┌──────────── SEO ─────────────┐
 * fetch ─┤                              ├── deploy
 *        ├──────── detail copy ─────────┤
 *        │                ↓             │
 *        └──── lifestyle+detail imgs ─── QA ──┘
 *
 * 总耗时 ≈ max(seo, copy+imgs+qa) 而不是之前的顺序相加
 */
export const productFullContent = inngest.createFunction(
  {
    id: "product-full-content",
    name: "商品完整内容生成",
    retries: 2,
    concurrency: { limit: 5 },
    triggers: [{ event: "content/product.full.requested" }],
  },
  async ({ event, step }) => {
    const { product_id, integration_id, ops_task_id, skip_deploy } = event.data;

    // ── Node 1: 获取商品 ──
    const product = await step.run("fetch-product", async () => {
      const { data } = await supabase.from("products").select("*").eq("id", product_id).single();
      if (!data?.shopify_product_id) throw new Error("no shopify product");
      return data;
    });

    // ── Node 2 & 3 并行：SEO + 详情文案 ──
    const [seo, copy] = await Promise.all([
      step.run("generate-seo", async () => {
        const { result } = await executeSkill(
          "product_seo_optimize",
          { product },
          { sourceModule: "inngest_dag", productId: product_id, productName: product.name }
        );
        return result.output as Record<string, unknown>;
      }),
      step.run("generate-copy", async () => {
        const { result } = await executeSkill(
          "product_detail_page",
          { product },
          { sourceModule: "inngest_dag", productId: product_id, productName: product.name }
        );
        return result.output as Record<string, unknown>;
      }),
    ]);

    // ── Node 4: 并行生成 2 张图 ──
    const images = await step.run("generate-images", async () => {
      const prompts = [
        {
          prompt: (copy.image_prompt as string) ||
            `Professional lifestyle photo of ${product.name}, ${product.category || "fashion"}, natural lighting, model wearing`,
          style: "lifestyle" as const,
          size: "16:9" as const,
          label: "lifestyle",
        },
        {
          prompt: `Product detail close-up of ${product.name}, showing texture and quality, studio lighting, white background`,
          style: "product_photo" as const,
          size: "1:1" as const,
          label: "detail",
        },
      ];
      return await generateImages(prompts);
    });

    // ── Node 5: 组装 HTML ──
    const bodyHtml = await step.run("assemble-html", async () => {
      return assembleDetailPage(
        {
          title: (copy.title as string) || product.name,
          subtitle: copy.subtitle as string,
          highlights: copy.highlights as string[],
          description: copy.description as string,
          specs: copy.specs as Array<{ name: string; value: string }>,
          cta_primary: copy.cta_primary as string,
          cta_secondary: copy.cta_secondary as string,
        },
        product.image_url,
        images
      );
    });

    // ── Node 6: QA 打分 ──
    const qa = await step.run("qa-review", async () => {
      return await reviewContent("detail_page", { body_html: bodyHtml, ...copy }, { name: product.name, category: product.category });
    });

    if (!qa.passed) {
      return { status: "qa_rejected", score: qa.score, improvements: qa.improvements };
    }

    // ── Node 7 & 8 并行部署（可跳过） ──
    if (!skip_deploy && integration_id) {
      await Promise.all([
        step.run("deploy-body", () =>
          updateProductBodyHtml(integration_id, product.shopify_product_id, product.id, bodyHtml)
        ),
        step.run("deploy-seo", () =>
          updateProductSEO(integration_id, product.shopify_product_id, product.id, {
            meta_title: seo.meta_title as string,
            meta_description: seo.meta_description as string,
            tags: seo.tags as string,
          })
        ),
      ]);
    }

    // ── Node 9: 标记运营任务完成 ──
    if (ops_task_id) {
      await step.run("mark-ops-task", async () => {
        await supabase.from("ops_daily_tasks").update({
          execution_status: "auto_executed",
          execution_result: {
            action: "product_content_deployed_via_dag",
            product: product.name,
            qa_score: qa.score,
            images: images.length,
            body_html_length: bodyHtml.length,
          },
          updated_at: new Date().toISOString(),
        }).eq("id", ops_task_id);
      });
    }

    return {
      status: "success",
      product: product.name,
      qa_score: qa.score,
      images_generated: images.length,
      body_html_length: bodyHtml.length,
      deployed: !skip_deploy,
    };
  }
);

/**
 * 首页 Hero 更新 — 简单流：生成 → 保存
 */
export const homepageHeroUpdate = inngest.createFunction(
  {
    id: "homepage-hero-update",
    name: "首页 Hero 更新",
    retries: 2,
    triggers: [{ event: "content/homepage.hero.requested" }],
  },
  async ({ event, step }) => {
    const { brand_name, season, ops_task_id } = event.data;

    const content = await step.run("generate-hero", async () => {
      const { result } = await executeSkill(
        "homepage_hero",
        { brand_name, season },
        { sourceModule: "inngest_dag" }
      );
      return result.output as Record<string, unknown>;
    });

    if (ops_task_id) {
      await step.run("mark-ops-task", async () => {
        await supabase.from("ops_daily_tasks").update({
          execution_status: "auto_executed",
          execution_result: { action: "homepage_hero_generated", output: content },
          updated_at: new Date().toISOString(),
        }).eq("id", ops_task_id);
      });
    }

    return { status: "success", output: content };
  }
);

export const functions = [productFullContent, homepageHeroUpdate];
