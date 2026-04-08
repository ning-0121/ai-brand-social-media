-- OEM/ODM B2B 业务系统
-- Run in Supabase SQL Editor

-- ============================================
-- 1. 买家档案
-- ============================================
CREATE TABLE IF NOT EXISTS buyers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  whatsapp_phone TEXT,
  country TEXT,
  country_code TEXT,
  category TEXT,
  estimated_annual_volume TEXT,
  relationship_stage TEXT NOT NULL DEFAULT 'new'
    CHECK (relationship_stage IN ('new', 'engaged', 'quoted', 'sampled', 'negotiating', 'customer', 'dormant')),
  source TEXT,
  ai_insights JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyers_country ON buyers(country);
CREATE INDEX IF NOT EXISTS idx_buyers_stage ON buyers(relationship_stage);
CREATE INDEX IF NOT EXISTS idx_buyers_whatsapp ON buyers(whatsapp_phone);

-- ============================================
-- 2. 询盘
-- ============================================
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES buyers(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('website_form', 'whatsapp', 'email', 'referral')),
  source_ref TEXT,
  raw_content TEXT,
  ai_classification TEXT,
  ai_priority TEXT NOT NULL DEFAULT 'medium' CHECK (ai_priority IN ('high', 'medium', 'low')),
  ai_extracted_needs JSONB DEFAULT '{}',
  ai_summary TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'quoted', 'sampled', 'closed_won', 'closed_lost')),
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_priority ON inquiries(ai_priority);
CREATE INDEX IF NOT EXISTS idx_inquiries_buyer ON inquiries(buyer_id);

-- ============================================
-- 3. WhatsApp 对话
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES buyers(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  display_name TEXT,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  ai_mode TEXT NOT NULL DEFAULT 'draft' CHECK (ai_mode IN ('auto', 'draft', 'off')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone)
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_status ON whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_wa_conv_last_msg ON whatsapp_conversations(last_message_at DESC);

-- ============================================
-- 4. WhatsApp 消息
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  wamid TEXT UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'template')),
  content TEXT,
  media_url TEXT,
  media_mime TEXT,
  ai_generated BOOLEAN DEFAULT false,
  ai_confidence DECIMAL(3,2),
  requires_approval BOOLEAN DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'received'
    CHECK (status IN ('received', 'queued', 'sent', 'delivered', 'read', 'failed', 'draft')),
  raw_payload JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_msg_conv ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_created ON whatsapp_messages(created_at DESC);

-- ============================================
-- 5. 报价单
-- ============================================
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES buyers(id) ON DELETE SET NULL,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  quote_number TEXT,
  products JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(12,2),
  total DECIMAL(12,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  incoterms TEXT,
  payment_terms TEXT,
  lead_time TEXT,
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_buyer ON quotations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);

-- ============================================
-- 6. RLS Policies
-- ============================================
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyers_all" ON buyers FOR ALL USING (true);
CREATE POLICY "inquiries_all" ON inquiries FOR ALL USING (true);
CREATE POLICY "wa_conv_all" ON whatsapp_conversations FOR ALL USING (true);
CREATE POLICY "wa_msg_all" ON whatsapp_messages FOR ALL USING (true);
CREATE POLICY "quotations_all" ON quotations FOR ALL USING (true);

-- ============================================
-- 7. 样例数据 (用于演示 UI)
-- ============================================
INSERT INTO buyers (company, contact_name, contact_email, whatsapp_phone, country, country_code, category, estimated_annual_volume, relationship_stage, source, ai_insights, tags) VALUES
('Atlantic Apparel Co.', 'Michael Johnson', 'michael@atlanticapparel.com', '+13105551234', 'United States', 'US', 'apparel', '100k+', 'engaged', 'whatsapp', '{"buyer_type": "brand", "purchase_pattern": "quarterly large orders", "price_sensitivity": "medium"}', ARRAY['VIP', 'recurring']),
('Lumière Boutique', 'Sophie Martin', 'sophie@lumiere.fr', '+33612345678', 'France', 'FR', 'apparel', '10k-100k', 'quoted', 'website_form', '{"buyer_type": "boutique", "focus": "premium organic cotton"}', ARRAY['boutique', 'premium']),
('Ramos Sportswear', 'Carlos Ramos', 'cramos@ramossport.mx', '+525512345678', 'Mexico', 'MX', 'sportswear', '<10k', 'new', 'whatsapp', '{"buyer_type": "small_brand"}', ARRAY['new']),
('Tokyo Streetwear Lab', 'Yuki Tanaka', 'yuki@tslab.jp', '+819012345678', 'Japan', 'JP', 'streetwear', '10k-100k', 'sampled', 'referral', '{"buyer_type": "designer", "focus": "premium quality"}', ARRAY['designer', 'high_value']),
('Berlin Eco Fashion', 'Anna Schmidt', 'anna@berlinecofashion.de', '+4915112345678', 'Germany', 'DE', 'sustainable', '10k-100k', 'negotiating', 'website_form', '{"buyer_type": "sustainable_brand", "focus": "GOTS certified"}', ARRAY['sustainable', 'certified'])
ON CONFLICT DO NOTHING;

INSERT INTO inquiries (buyer_id, source, raw_content, ai_classification, ai_priority, ai_extracted_needs, ai_summary, status)
SELECT
  id,
  'whatsapp',
  'Hi, we are interested in your organic cotton tees. We need 5000 pcs in 3 colors (white, black, navy). MOQ? Lead time? Can you ship to USA?',
  'quote_request',
  'high',
  '{"products": ["organic cotton t-shirts"], "quantity": 5000, "colors": ["white", "black", "navy"], "destination": "USA"}'::jsonb,
  '美国买家询问 5000 件有机棉 T 恤报价，3 色，需了解 MOQ 和交期',
  'new'
FROM buyers WHERE company = 'Atlantic Apparel Co.'
ON CONFLICT DO NOTHING;

INSERT INTO inquiries (buyer_id, source, raw_content, ai_classification, ai_priority, ai_extracted_needs, ai_summary, status)
SELECT
  id,
  'website_form',
  'Looking for premium silk blouses. We are a small boutique. Could you send samples?',
  'sample',
  'medium',
  '{"products": ["silk blouses"], "type": "sample_request"}'::jsonb,
  '法国精品店询问真丝衬衫样品',
  'in_progress'
FROM buyers WHERE company = 'Lumière Boutique'
ON CONFLICT DO NOTHING;

INSERT INTO whatsapp_conversations (buyer_id, phone, display_name, last_message_at, message_count, unread_count, ai_mode, status)
SELECT id, whatsapp_phone, contact_name, NOW() - INTERVAL '5 minutes', 4, 1, 'draft', 'active'
FROM buyers WHERE whatsapp_phone IS NOT NULL
ON CONFLICT (phone) DO NOTHING;
