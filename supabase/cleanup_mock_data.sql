-- ============================================
-- 清除所有 seed.sql 中的 mock 数据
-- 只保留真实 Shopify 同步的数据
-- ============================================

-- 1. 删除 mock 产品（没有 shopify_product_id 的都是假数据）
DELETE FROM products WHERE shopify_product_id IS NULL;

-- 2. 删除 mock 热门商品
DELETE FROM hot_products;

-- 3. 删除 mock 竞品（花西子、小米、三只松鼠等中国品牌）
DELETE FROM competitors WHERE name IN ('花西子', '小米', '三只松鼠', 'MUJI', '完美日记', 'Anker', '元气森林', '网易严选');

-- 4. 删除 mock 内容
DELETE FROM contents WHERE title IN (
  '夏日清凉穿搭 | 3套不重样',
  '这个风扇也太好用了吧！',
  'Shopify店铺首页优化指南',
  '防晒衣测评 | 5款热门对比',
  '直播预告：618大促专场',
  'Amazon选品思路分享',
  '宠物喂食器开箱测评',
  '新品上架预告 | 春季系列',
  '如何打造爆款产品页',
  '冰丝防晒衣穿搭合集',
  '耳机音质盲测挑战',
  '品牌故事 | 我们为什么做这个品牌'
);

-- 5. 删除 mock 社媒账号（保留通过 OAuth 连接的真实账号）
-- 只删除没有 integration_id 关联的假账号
DELETE FROM social_accounts WHERE id NOT IN (
  SELECT sa.id FROM social_accounts sa
  INNER JOIN integrations i ON (
    sa.platform = i.platform AND i.status = 'active'
  )
) AND handle IN ('@brandmind_official', '@brandmind.ai', 'BrandMind品牌工坊', 'BrandMind Store', 'brandmind.myshopify.com', '@brandmind.lifestyle');

-- 6. 删除 mock 排期帖子（没有关联真实 content_queue 的）
DELETE FROM scheduled_posts WHERE content_preview IN (
  '夏日清凉穿搭分享 ☀️ 三套不重样的搭配',
  '便携风扇开箱测评 🌀 这个夏天必备',
  '新品上架预告：冰丝系列 🧊',
  '618大促倒计时海报',
  '品牌故事系列第3期',
  '周末穿搭灵感 | 城市户外风',
  '耳机盲测挑战赛 🎧',
  '防晒衣5款横评',
  'Shopify店铺优化技巧',
  '宠物喂食器使用教程'
);

-- 7. 删除 mock 内容模板（如果不需要的话保留也行，但数据是中文电商的不适合 US）
-- DELETE FROM content_templates;

-- 8. 删除 mock 技能包（同上）
-- DELETE FROM skill_packs;
