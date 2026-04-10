/**
 * Workflow C: 活动素材包生成
 *
 * 输入活动 brief → 生成全套素材 → 审批 → 导出
 * 素材包含：着陆页 + Banner + 社媒文案 + Email
 */

import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
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

  // Generate 1 key asset per call to stay within Vercel 60s timeout.
  // Campaign poster + banner is the most impactful single asset.
  try {
    const { result } = await executeSkill("campaign_poster", {
      campaign_theme: campaignName,
      template_id: "wide_banner",
    }, { sourceModule: "workflow-c" });
    assets.banner_copy = result.output;

    if (result.output) {
      const out = result.output as Record<string, unknown>;
      assets.banner_html = assembleBanner(
        out.headline as string || campaignName,
        out.subheadline as string || "",
        out.cta as string || "Shop Now"
      );
    }
    assetsGenerated++;
  } catch (e) { assets.banner_error = (e as Error).message; }

  // Note: Landing page, social posts, email can be generated in follow-up
  // workflow calls to avoid Vercel timeout. Each takes ~15s with Claude.
  assets.pending_assets = ["landing_page", "social_posts", "email"];

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
