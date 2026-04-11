import { NextResponse } from "next/server";
import { runProductPageWorkflow } from "@/agents/workflows/product-page-workflow";
import { runContentPublishWorkflow } from "@/agents/workflows/content-publish-workflow";
import { runCampaignPackWorkflow } from "@/agents/workflows/campaign-pack-workflow";
import { requireAuth } from "@/lib/api-auth";
import { validateBody, workflowExecuteSchema } from "@/lib/api-validation";

export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const validated = validateBody(body, workflowExecuteSchema);
    if (validated.error) return validated.error;

    const { workflow, product_id, campaign_name, campaign_type, product_ids } = validated.data;

    switch (workflow) {
      case "product_page": {
        if (!product_id) return NextResponse.json({ error: "缺少 product_id" }, { status: 400 });
        const result = await runProductPageWorkflow(product_id);
        return NextResponse.json(result);
      }

      case "content_publish": {
        if (!product_id) return NextResponse.json({ error: "缺少 product_id" }, { status: 400 });
        const result = await runContentPublishWorkflow(product_id);
        return NextResponse.json(result);
      }

      case "campaign_pack": {
        if (!campaign_name) return NextResponse.json({ error: "缺少 campaign_name" }, { status: 400 });
        const result = await runCampaignPackWorkflow(campaign_name, campaign_type, product_ids);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: `未知工作流: ${workflow}` }, { status: 400 });
    }
  } catch (err) {
    console.error("Workflow execution error:", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "执行失败",
    }, { status: 500 });
  }
}
