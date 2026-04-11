import { NextResponse } from "next/server";
import { z, ZodSchema } from "zod";

/**
 * Validate a request body against a Zod schema.
 * Returns the parsed data or a 400 error response.
 */
export function validateBody<T>(
  body: unknown,
  schema: ZodSchema<T>
): { data: T; error?: never } | { data?: never; error: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return {
      error: NextResponse.json(
        { error: `参数校验失败: ${issues}`, details: result.error.issues },
        { status: 400 }
      ),
    };
  }
  return { data: result.data };
}

// ============ Shared Schemas ============

export const shopifyActionSchema = z.object({
  action: z.string().min(1, "缺少 action"),
  integration_id: z.string().uuid("无效的 integration_id"),
}).passthrough();

export const seoQuickApplySchema = z.object({
  integration_id: z.string().uuid("无效的 integration_id"),
  shopify_product_id: z.number().int().positive("无效的 shopify_product_id"),
  product_id: z.string().uuid("无效的 product_id"),
  new_values: z.object({
    title: z.string().optional(),
    body_html: z.string().optional(),
    meta_title: z.string().optional(),
    meta_description: z.string().optional(),
    tags: z.string().optional(),
  }),
});

export const generateSchema = z.object({
  scene: z.string().default("content"),
  topic: z.string().min(1, "请输入内容"),
}).passthrough();

export const generateImageSchema = z.object({
  prompt: z.string().min(1, "请输入图片描述"),
  size: z.string().optional(),
  quantity: z.number().int().min(1).max(4).optional(),
  style: z.string().optional(),
});

export const approvalActionSchema = z.object({
  action: z.enum(["approve", "reject", "retry", "create"]),
}).passthrough();

export const workflowExecuteSchema = z.object({
  workflow: z.enum(["product_page", "content_publish", "campaign_pack"]),
  product_id: z.string().uuid().optional(),
  campaign_name: z.string().optional(),
  campaign_type: z.string().optional(),
  product_ids: z.array(z.string().uuid()).optional(),
});

export const brandProfileSchema = z.object({
  brand_name: z.string().min(1, "品牌名称不能为空"),
  voice_style: z.string().optional(),
  visual_style: z.string().optional(),
  target_audience: z.string().optional(),
  key_categories: z.array(z.string()).optional(),
  preferred_platforms: z.array(z.string()).optional(),
  primary_colors: z.array(z.string()).optional(),
  secondary_colors: z.array(z.string()).optional(),
  typography_notes: z.string().optional(),
  banned_words: z.array(z.string()).optional(),
  core_value_props: z.array(z.string()).optional(),
  pricing_position: z.string().optional(),
}).passthrough();

export const teamInviteSchema = z.object({
  action: z.literal("invite"),
  email: z.string().email("请输入有效的邮箱地址"),
  role: z.enum(["admin", "editor", "viewer"]).default("editor"),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1, "消息不能为空").max(5000, "消息过长"),
  conversation_id: z.string().optional(),
  visitor_name: z.string().optional(),
  channel: z.string().optional(),
  business_type: z.string().optional(),
});
