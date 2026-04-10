/**
 * Workflow C: 活动素材包生成
 *
 * 输入活动 brief → 生成全套素材 → 审批 → 导出
 * 素材包含：着陆页 + Banner + 社媒文案 + Email
 */

import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import { generateImage } from "@/lib/image-service";
import { assembleBanner } from "@/lib/content-assembler";
import { createApprovalTask } from "@/lib/supabase-approval";

export async function runCampaignPackWorkflow(
  campaignName: string,
  campaignType: string = "custom",
  productIds?: string[]
): Promise<{
  success: boolean;
  assets_generated: number;
  approval_id?: string;
}> {
  const assets: Record<string, unknown> = {};
  let assetsGenerated = 0;

  // Load products if provided
  const products = [];
  if (productIds && productIds.length > 0) {
    for (const id of productIds.slice(0, 5)) {
      const { data } = await supabase.from("products").select("*").eq("id", id).single();
      if (data) products.push(data);
    }
  }

  // 1. Landing page
  try {
    const { result } = await executeSkill("landing_page", {
      page_goal: "purchase",
      headline_idea: campaignName,
      product: products[0],
    }, { sourceModule: "workflow-c" });
    assets.landing_page = result.output;
    assetsGenerated++;
  } catch (e) { assets.landing_page_error = (e as Error).message; }

  // 2. Banner + image
  try {
    const { result } = await executeSkill("campaign_poster", {
      campaign_theme: campaignName,
      template_id: "wide_banner",
    }, { sourceModule: "workflow-c" });
    assets.banner_copy = result.output;

    const bannerUrl = await generateImage(
      `Campaign banner for "${campaignName}", fashion brand, bold colors, professional`,
      { style: "social_media", size: "16:9" }
    );
    assets.banner_image = bannerUrl;

    if (result.output) {
      const out = result.output as Record<string, unknown>;
      assets.banner_html = assembleBanner(
        out.headline as string || campaignName,
        out.subheadline as string || "",
        out.cta as string || "Shop Now",
        bannerUrl || undefined
      );
    }
    assetsGenerated++;
  } catch (e) { assets.banner_error = (e as Error).message; }

  // 3. Social post
  try {
    const { result } = await executeSkill("social_post_pack", {
      platform: "instagram",
      product: products[0],
    }, { sourceModule: "workflow-c" });
    assets.social_posts = result.output;
    assetsGenerated++;
  } catch (e) { assets.social_error = (e as Error).message; }

  // 4. Email
  try {
    const { result } = await executeSkill("email_copy", {
      email_type: "promotion",
      brand_name: "JOJOFEIFEI",
      offer: campaignName,
    }, { sourceModule: "workflow-c" });
    assets.email = result.output;
    assetsGenerated++;
  } catch (e) { assets.email_error = (e as Error).message; }

  // 5. Create creative project
  const { data: project } = await supabase.from("creative_projects").insert({
    project_type: "campaign",
    title: `活动素材包: ${campaignName}`,
    status: "review",
    brief: { campaign_name: campaignName, campaign_type: campaignType, product_ids: productIds },
    generated_output: assets,
    assets: [
      { id: "lp", asset_type: "html", label: "着陆页", status: assets.landing_page ? "generated" : "pending" },
      { id: "banner", asset_type: "image", label: "Banner", url: assets.banner_image, status: assets.banner_image ? "generated" : "pending" },
      { id: "social", asset_type: "copy", label: "社媒帖子", status: assets.social_posts ? "generated" : "pending" },
      { id: "email", asset_type: "copy", label: "邮件", status: assets.email ? "generated" : "pending" },
    ],
  }).select().single();

  // 6. Create approval
  const approval = await createApprovalTask({
    type: "content_publish",
    entity_type: "contents",
    title: `[活动素材包] ${campaignName}`,
    description: `AI 生成了 ${assetsGenerated} 项活动素材:\n- 着陆页: ${assets.landing_page ? "✅" : "❌"}\n- Banner: ${assets.banner_image ? "✅" : "❌"}\n- 社媒帖子: ${assets.social_posts ? "✅" : "❌"}\n- 邮件: ${assets.email ? "✅" : "❌"}\n\n审批后可导出素材包。`,
    payload: {
      workflow: "campaign_pack_workflow",
      campaign_name: campaignName,
      project_id: project?.id,
      assets_generated: assetsGenerated,
      assets,
    },
  });

  // Update project with approval
  if (project) {
    await supabase.from("creative_projects").update({ approval_id: approval.id }).eq("id", project.id);
  }

  return { success: true, assets_generated: assetsGenerated, approval_id: approval.id };
}
