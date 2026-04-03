-- Shopify Deep Sync tables: Orders, Customers, Order Items
-- Run in Supabase SQL Editor

-- ============ Shopify Orders ============
CREATE TABLE IF NOT EXISTS shopify_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  shopify_order_id BIGINT NOT NULL,
  order_number TEXT,
  email TEXT,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal_price NUMERIC(12,2) DEFAULT 0,
  total_tax NUMERIC(12,2) DEFAULT 0,
  total_discounts NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  financial_status TEXT,
  fulfillment_status TEXT,
  customer_shopify_id BIGINT,
  order_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shopify_order_id)
);

CREATE INDEX IF NOT EXISTS idx_shopify_orders_user ON shopify_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_date ON shopify_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_shopify_id ON shopify_orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_customer ON shopify_orders(customer_shopify_id);

DROP TRIGGER IF EXISTS update_shopify_orders_updated_at ON shopify_orders;
CREATE TRIGGER update_shopify_orders_updated_at
  BEFORE UPDATE ON shopify_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============ Shopify Customers ============
CREATE TABLE IF NOT EXISTS shopify_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  shopify_customer_id BIGINT NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  orders_count INTEGER DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at_shopify TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shopify_customer_id)
);

CREATE INDEX IF NOT EXISTS idx_shopify_customers_user ON shopify_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_shopify_id ON shopify_customers(shopify_customer_id);

DROP TRIGGER IF EXISTS update_shopify_customers_updated_at ON shopify_customers;
CREATE TRIGGER update_shopify_customers_updated_at
  BEFORE UPDATE ON shopify_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============ Shopify Order Items ============
CREATE TABLE IF NOT EXISTS shopify_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES shopify_orders(id) ON DELETE CASCADE,
  shopify_line_item_id BIGINT,
  product_id BIGINT,
  variant_id BIGINT,
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sku TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopify_order_items_order ON shopify_order_items(order_id);

-- ============ RLS Policies ============
ALTER TABLE shopify_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_order_items ENABLE ROW LEVEL SECURITY;

-- Orders RLS
CREATE POLICY "Users can view own orders" ON shopify_orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON shopify_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON shopify_orders
  FOR UPDATE USING (auth.uid() = user_id);

-- Customers RLS
CREATE POLICY "Users can view own customers" ON shopify_customers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own customers" ON shopify_customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own customers" ON shopify_customers
  FOR UPDATE USING (auth.uid() = user_id);

-- Order Items RLS (via order's user_id)
CREATE POLICY "Users can view own order items" ON shopify_order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM shopify_orders WHERE shopify_orders.id = shopify_order_items.order_id AND shopify_orders.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own order items" ON shopify_order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM shopify_orders WHERE shopify_orders.id = shopify_order_items.order_id AND shopify_orders.user_id = auth.uid())
  );

-- Temporary anon access (matching existing convention)
CREATE POLICY "Allow anon read shopify_orders" ON shopify_orders FOR SELECT USING (true);
CREATE POLICY "Allow anon write shopify_orders" ON shopify_orders FOR ALL USING (true);
CREATE POLICY "Allow anon read shopify_customers" ON shopify_customers FOR SELECT USING (true);
CREATE POLICY "Allow anon write shopify_customers" ON shopify_customers FOR ALL USING (true);
CREATE POLICY "Allow anon read shopify_order_items" ON shopify_order_items FOR SELECT USING (true);
CREATE POLICY "Allow anon write shopify_order_items" ON shopify_order_items FOR ALL USING (true);
