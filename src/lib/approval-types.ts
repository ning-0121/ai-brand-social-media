export type ApprovalTaskType =
  | "seo_update"
  | "product_edit"
  | "price_update"
  | "inventory_update"
  | "content_publish"
  | "social_post";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "executed" | "failed";

export interface ApprovalTask {
  id: string;
  type: ApprovalTaskType;
  entity_id: string | null;
  entity_type: string | null;
  title: string;
  description: string | null;
  payload: {
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    shopify_product_id?: number;
    integration_id?: string;
    [key: string]: unknown;
  };
  status: ApprovalStatus;
  created_by: "ai" | "user";
  reviewed_by: string | null;
  reviewed_at: string | null;
  execution_result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export const APPROVAL_TYPE_LABELS: Record<ApprovalTaskType, string> = {
  seo_update: "SEO 优化",
  product_edit: "商品编辑",
  price_update: "价格调整",
  inventory_update: "库存更新",
  content_publish: "内容发布",
  social_post: "社媒发布",
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "待审批",
  approved: "已批准",
  rejected: "已拒绝",
  executed: "已执行",
  failed: "执行失败",
};
