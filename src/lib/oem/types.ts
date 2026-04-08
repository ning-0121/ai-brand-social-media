export type RelationshipStage =
  | "new" | "engaged" | "quoted" | "sampled" | "negotiating" | "customer" | "dormant";

export type InquirySource = "website_form" | "whatsapp" | "email" | "referral";
export type InquiryStatus = "new" | "in_progress" | "quoted" | "sampled" | "closed_won" | "closed_lost";
export type Priority = "high" | "medium" | "low";
export type AiMode = "auto" | "draft" | "off";

export interface Buyer {
  id: string;
  company: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  whatsapp_phone?: string | null;
  country?: string | null;
  country_code?: string | null;
  category?: string | null;
  estimated_annual_volume?: string | null;
  relationship_stage: RelationshipStage;
  source?: string | null;
  ai_insights?: Record<string, unknown>;
  tags?: string[];
  notes?: string | null;
  last_contact_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inquiry {
  id: string;
  buyer_id?: string | null;
  source: InquirySource;
  source_ref?: string | null;
  raw_content?: string | null;
  ai_classification?: string | null;
  ai_priority: Priority;
  ai_extracted_needs?: Record<string, unknown>;
  ai_summary?: string | null;
  status: InquiryStatus;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
  buyer?: Buyer | null;
}

export interface WhatsappConversation {
  id: string;
  buyer_id?: string | null;
  phone: string;
  display_name?: string | null;
  last_message_at?: string | null;
  message_count: number;
  unread_count: number;
  ai_mode: AiMode;
  status: "active" | "archived" | "blocked";
  created_at: string;
  updated_at: string;
  buyer?: Buyer | null;
  last_message_preview?: string | null;
}

export interface WhatsappMessage {
  id: string;
  conversation_id: string;
  wamid?: string | null;
  direction: "inbound" | "outbound";
  message_type: "text" | "image" | "document" | "audio" | "video" | "template";
  content?: string | null;
  media_url?: string | null;
  media_mime?: string | null;
  ai_generated: boolean;
  ai_confidence?: number | null;
  requires_approval: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  status: "received" | "queued" | "sent" | "delivered" | "read" | "failed" | "draft";
  raw_payload?: Record<string, unknown> | null;
  sent_at?: string | null;
  created_at: string;
}

export interface Quotation {
  id: string;
  buyer_id?: string | null;
  inquiry_id?: string | null;
  quote_number?: string | null;
  products: QuoteProduct[];
  subtotal?: number | null;
  total?: number | null;
  currency: string;
  incoterms?: string | null;
  payment_terms?: string | null;
  lead_time?: string | null;
  valid_until?: string | null;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  pdf_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteProduct {
  sku?: string;
  name: string;
  qty: number;
  unit_price: number;
  total: number;
  notes?: string;
}
