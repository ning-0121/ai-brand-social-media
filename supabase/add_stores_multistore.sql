-- ============================================================
-- Multi-Store Architecture Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. stores 表（顶级业务实体）
CREATE TABLE IF NOT EXISTS stores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  platform        TEXT NOT NULL CHECK (platform IN (
                    'shopify','amazon','tiktok_shop','etsy',
                    'walmart','faire','independent'
                  )),
  owner_user_id   UUID REFERENCES auth.users(id),
  integration_id  UUID REFERENCES integrations(id),
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','pending')),
  currency        TEXT NOT NULL DEFAULT 'USD',
  logo_url        TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stores_select" ON stores;
DROP POLICY IF EXISTS "stores_insert" ON stores;
DROP POLICY IF EXISTS "stores_update" ON stores;
CREATE POLICY "stores_select" ON stores FOR SELECT USING (true);
CREATE POLICY "stores_insert" ON stores FOR INSERT WITH CHECK (auth.uid() = owner_user_id OR owner_user_id IS NULL);
CREATE POLICY "stores_update" ON stores FOR UPDATE USING (auth.uid() = owner_user_id OR owner_user_id IS NULL);

-- 2. 从现有 integrations 自动创建 stores（只迁移销售平台，排除 GA4 等）
INSERT INTO stores (name, platform, owner_user_id, integration_id, status)
SELECT
  COALESCE(NULLIF(TRIM(store_name), ''), platform || ' 店铺') AS name,
  platform,
  user_id AS owner_user_id,
  id AS integration_id,
  CASE WHEN status = 'active' THEN 'active' ELSE 'inactive' END
FROM integrations
WHERE platform IN ('shopify','amazon','tiktok_shop','etsy','walmart','faire')
ON CONFLICT DO NOTHING;

-- 3. 为核心业务表加 store_id 列
ALTER TABLE products             ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE shopify_orders       ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE approval_tasks       ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE diagnostic_reports   ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE diagnostic_findings  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE ops_daily_tasks      ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE ops_goals            ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE brand_guides         ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- 4. 把现有 products/orders 关联到已有 store（通过 integrations.id 反查）
UPDATE products p
SET store_id = s.id
FROM stores s
WHERE p.store_id IS NULL
  AND s.integration_id IS NOT NULL
  AND p.platform = s.platform;

-- 5. PPC 广告表
CREATE TABLE IF NOT EXISTS ppc_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES stores(id),
  platform        TEXT NOT NULL CHECK (platform IN ('amazon','google','meta','tiktok')),
  campaign_id     TEXT,
  name            TEXT NOT NULL,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  campaign_type   TEXT,              -- Sponsored Products / Sponsored Brands / etc.
  budget_daily    DECIMAL(12,2),
  spend           DECIMAL(12,2) DEFAULT 0,
  sales           DECIMAL(12,2) DEFAULT 0,
  impressions     INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  acos            DECIMAL(6,4),      -- Advertising Cost of Sale
  tacos           DECIMAL(6,4),      -- Total ACoS
  roas            DECIMAL(8,4),
  period_start    DATE,
  period_end      DATE,
  raw_data        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ppc_keywords (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID REFERENCES ppc_campaigns(id),
  store_id        UUID REFERENCES stores(id),
  keyword         TEXT NOT NULL,
  match_type      TEXT CHECK (match_type IN ('broad','phrase','exact','negative_exact','negative_phrase')),
  bid             DECIMAL(8,4),
  spend           DECIMAL(12,2) DEFAULT 0,
  sales           DECIMAL(12,2) DEFAULT 0,
  impressions     INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  acos            DECIMAL(6,4),
  conversions     INTEGER DEFAULT 0,
  ai_suggestion   TEXT,              -- AI 建议：提价/降价/否定/保持
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ppc_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppc_keywords  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppc_campaigns_select" ON ppc_campaigns FOR SELECT USING (true);
CREATE POLICY "ppc_campaigns_all"    ON ppc_campaigns FOR ALL    USING (true);
CREATE POLICY "ppc_keywords_select"  ON ppc_keywords  FOR SELECT USING (true);
CREATE POLICY "ppc_keywords_all"     ON ppc_keywords  FOR ALL    USING (true);

-- 6. 供应链 & 采购表
CREATE TABLE IF NOT EXISTS suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES stores(id),
  name            TEXT NOT NULL,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_wechat  TEXT,
  country         TEXT DEFAULT 'CN',
  lead_time_days  INTEGER DEFAULT 30,
  min_order_qty   INTEGER,
  notes           TEXT,
  status          TEXT DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES stores(id),
  supplier_id     UUID REFERENCES suppliers(id),
  po_number       TEXT,
  status          TEXT DEFAULT 'draft'
                    CHECK (status IN ('draft','confirmed','in_production','shipped','arrived','cancelled')),
  order_date      DATE DEFAULT CURRENT_DATE,
  expected_ship   DATE,
  expected_arrival DATE,
  actual_arrival  DATE,
  total_units     INTEGER DEFAULT 0,
  total_cost_usd  DECIMAL(12,2) DEFAULT 0,
  freight_cost    DECIMAL(12,2) DEFAULT 0,
  customs_cost    DECIMAL(12,2) DEFAULT 0,
  currency        TEXT DEFAULT 'USD',
  exchange_rate   DECIMAL(10,6) DEFAULT 1,
  notes           TEXT,
  line_items      JSONB DEFAULT '[]',  -- [{sku, product_name, qty, unit_cost}]
  tracking_info   JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_levels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES stores(id),
  product_id      UUID REFERENCES products(id),
  sku             TEXT,
  location        TEXT DEFAULT 'FBA',   -- FBA / 3PL / warehouse
  qty_on_hand     INTEGER DEFAULT 0,
  qty_inbound     INTEGER DEFAULT 0,    -- 在途库存
  qty_reserved    INTEGER DEFAULT 0,
  daily_velocity  DECIMAL(8,2),         -- 日均销量
  days_of_supply  INTEGER,              -- 剩余天数
  reorder_point   INTEGER,              -- 补货触发点
  reorder_qty     INTEGER,              -- 建议补货量
  last_updated    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE suppliers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_levels  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_all"        ON suppliers        FOR ALL USING (true);
CREATE POLICY "purchase_orders_all"  ON purchase_orders  FOR ALL USING (true);
CREATE POLICY "inventory_levels_all" ON inventory_levels FOR ALL USING (true);

-- 7. 团队管理表
CREATE TABLE IF NOT EXISTS team_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   UUID REFERENCES auth.users(id),  -- 邀请人
  email           TEXT NOT NULL,
  name            TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'operator'
                    CHECK (role IN ('owner','manager','operator','designer','viewer')),
  store_ids       UUID[] DEFAULT '{}',              -- 有权限的店铺 IDs
  status          TEXT DEFAULT 'invited'
                    CHECK (status IN ('invited','active','inactive')),
  invited_at      TIMESTAMPTZ DEFAULT now(),
  joined_at       TIMESTAMPTZ,
  last_active_at  TIMESTAMPTZ
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_members_all" ON team_members FOR ALL USING (true);

-- 8. approval_tasks 加 assigned_to
ALTER TABLE approval_tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES team_members(id);
ALTER TABLE approval_tasks ADD COLUMN IF NOT EXISTS store_id_ref UUID REFERENCES stores(id);

-- 完成
SELECT 'Migration complete: stores, ppc, supply_chain, team tables created' AS result;
