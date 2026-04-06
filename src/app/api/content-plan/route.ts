import { NextResponse } from "next/server";
import { getContentSuggestions } from "@/lib/content-planner";
import { executeAgent } from "@/lib/agent-executor";
import { createApprovalTask } from "@/lib/supabase-approval";
import { createContent } from "@/lib/supabase-mutations";

export async function GET() {
  try {
    const suggestions = await getContentSuggestions();
    return NextResponse.json({ suggestions });
  } catch (error: unknown) {
    console.error("Content plan error:", error);
    return NextResponse.json({ error: "获取内容建议失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "generate": {
        // AI 生成完整内容方案
        const { topic, platform = "shopify", tone = "professional", product_name } = body;
        const fullTopic = product_name
          ? `为商品 "${product_name}" 创建营销内容。${topic || ""}`
          : topic;

        const result = await executeAgent("content_producer", "product_content", {
          topic: fullTopic,
          platform,
          tone,
        }, {});

        return NextResponse.json({ success: true, content: result });
      }

      case "save_draft": {
        // 保存为草稿
        const { title, body: contentBody, platform, content_type, tags, image_url } = body;
        const content = await createContent({
          title,
          body: contentBody,
          platform: platform || "shopify",
          content_type: content_type || "image_post",
          tags: tags || [],
          thumbnail_url: image_url,
          status: "draft",
        });
        return NextResponse.json({ success: true, content });
      }

      case "submit_approval": {
        // 保存内容 + 提交审批
        const { title, body: contentBody, platform, content_type, tags, image_url } = body;

        // 先保存内容
        const content = await createContent({
          title,
          body: contentBody,
          platform: platform || "shopify",
          content_type: content_type || "image_post",
          tags: tags || [],
          thumbnail_url: image_url,
          status: "pending",
        });

        // 创建审批任务
        const approval = await createApprovalTask({
          type: "content_publish",
          entity_id: content.id,
          entity_type: "contents",
          title: `[内容发布] ${title}`,
          description: `平台: ${platform}\n\n${contentBody?.slice(0, 300) || ""}`,
          payload: {
            content_id: content.id,
            title,
            body: contentBody,
            platform,
            content_type,
            tags,
            image_url,
          },
        });

        return NextResponse.json({ success: true, content, approval });
      }

      default:
        return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("Content plan POST error:", error);
    const msg = error instanceof Error ? error.message : "操作失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
