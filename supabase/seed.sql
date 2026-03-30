-- BrandMind AI Seed Data
-- Run this in Supabase SQL Editor after schema.sql

-- ============================================
-- 1. Hot Products
-- ============================================
INSERT INTO hot_products (name, platform, category, sales_volume, growth_rate, trend, price_range, rating) VALUES
('迷你便携风扇', 'tiktok', '3C数码', 52340, 23.5, 'up', '¥29-59', 4.7),
('冰丝防晒衣', 'xiaohongshu', '服饰', 38920, 45.2, 'up', '¥69-129', 4.8),
('便携榨汁杯', 'amazon', '家居生活', 28450, 12.3, 'up', '¥59-99', 4.5),
('瑜伽裤', 'instagram', '运动', 42100, 8.7, 'up', '¥89-169', 4.6),
('车载香薰', 'shopify', '汽车用品', 15600, -3.2, 'down', '¥39-79', 4.3),
('无线耳机', 'amazon', '3C数码', 67800, 5.1, 'up', '¥99-299', 4.4),
('防蓝光眼镜', 'tiktok', '配饰', 31200, 67.8, 'up', '¥29-69', 4.2),
('宠物自动喂食器', 'shopify', '宠物用品', 18900, 34.5, 'up', '¥129-299', 4.6),
('夏季冰袖', 'xiaohongshu', '服饰', 45600, 52.1, 'up', '¥19-39', 4.5),
('便携挂脖风扇', 'tiktok', '3C数码', 38700, 89.3, 'up', '¥49-99', 4.3),
('ins风手机壳', 'instagram', '配饰', 22300, 15.6, 'up', '¥19-49', 4.1),
('露营折叠椅', 'amazon', '户外', 12800, -1.5, 'down', '¥79-199', 4.7);

-- ============================================
-- 2. Competitors
-- ============================================
INSERT INTO competitors (name, platform, monthly_sales, price_range, rating, new_product_frequency, url) VALUES
('花西子', 'xiaohongshu', 850000, '¥89-399', 4.8, '每月2-3款', null),
('小米', 'amazon', 2300000, '¥49-4999', 4.6, '每周1-2款', null),
('三只松鼠', 'tiktok', 1200000, '¥9-199', 4.5, '每月5-8款', null),
('MUJI', 'shopify', 560000, '¥29-999', 4.7, '每季10-15款', null),
('完美日记', 'xiaohongshu', 980000, '¥39-199', 4.4, '每月3-5款', null),
('Anker', 'amazon', 1800000, '¥59-599', 4.8, '每月1-2款', null),
('元气森林', 'tiktok', 750000, '¥5-39', 4.3, '每季2-3款', null),
('网易严选', 'shopify', 430000, '¥19-1999', 4.6, '每周3-5款', null);

-- ============================================
-- 3. Contents
-- ============================================
INSERT INTO contents (title, body, platform, content_type, status, views, likes, comments, shares, tags, scheduled_at, published_at) VALUES
('夏日清凉穿搭 | 3套不重样', '今天给大家分享三套夏日清凉穿搭...', 'xiaohongshu', 'image_post', 'published', 12500, 890, 156, 234, ARRAY['穿搭', '夏季', '清凉'], null, NOW() - INTERVAL '2 days'),
('这个风扇也太好用了吧！', '最近发现了一个超好用的迷你风扇...', 'tiktok', 'short_video', 'published', 89000, 5600, 890, 1200, ARRAY['好物推荐', '风扇', '夏天'], null, NOW() - INTERVAL '1 day'),
('Shopify店铺首页优化指南', '如何让你的Shopify首页转化率翻倍...', 'independent', 'article', 'published', 3400, 234, 67, 89, ARRAY['Shopify', 'SEO', '转化率'], null, NOW() - INTERVAL '3 days'),
('防晒衣测评 | 5款热门对比', '夏天到了防晒衣该怎么选...', 'xiaohongshu', 'carousel', 'scheduled', 0, 0, 0, 0, ARRAY['防晒', '测评', '夏季'], NOW() + INTERVAL '1 day', null),
('直播预告：618大促专场', '明天晚上8点准时开播...', 'tiktok', 'short_video', 'scheduled', 0, 0, 0, 0, ARRAY['618', '直播', '大促'], NOW() + INTERVAL '2 days', null),
('Amazon选品思路分享', '今天聊聊我是怎么在Amazon上选品的...', 'instagram', 'carousel', 'published', 6700, 456, 123, 78, ARRAY['Amazon', '选品', '跨境电商'], null, NOW() - INTERVAL '5 days'),
('宠物喂食器开箱测评', '收到了最新款的自动喂食器...', 'tiktok', 'short_video', 'pending', 0, 0, 0, 0, ARRAY['宠物', '开箱', '好物'], null, null),
('新品上架预告 | 春季系列', '春季新品即将上线...', 'instagram', 'image_post', 'draft', 0, 0, 0, 0, ARRAY['新品', '春季', '预告'], null, null),
('如何打造爆款产品页', '产品页是转化的关键...', 'independent', 'article', 'published', 4500, 312, 89, 56, ARRAY['产品页', '转化', '电商'], null, NOW() - INTERVAL '7 days'),
('冰丝防晒衣穿搭合集', '最近入手了几件冰丝防晒衣...', 'xiaohongshu', 'image_post', 'published', 23400, 1560, 345, 567, ARRAY['防晒衣', '穿搭', '冰丝'], null, NOW() - INTERVAL '4 days'),
('耳机音质盲测挑战', '找了5个朋友来盲测耳机音质...', 'tiktok', 'short_video', 'published', 156000, 12300, 2340, 3450, ARRAY['耳机', '盲测', '3C'], null, NOW() - INTERVAL '6 days'),
('品牌故事 | 我们为什么做这个品牌', '每个品牌都有一个故事...', 'instagram', 'article', 'draft', 0, 0, 0, 0, ARRAY['品牌故事', '创业'], null, null);

-- ============================================
-- 4. Content Templates
-- ============================================
INSERT INTO content_templates (name, platform, content_type, prompt_template, example_output, usage_count, category) VALUES
('小红书种草笔记', 'xiaohongshu', 'image_post', '请为以下产品写一篇小红书种草笔记：{product_name}，特点：{features}，目标人群：{audience}', '今天给姐妹们安利一个超好用的...', 1256, '种草'),
('TikTok 短视频脚本', 'tiktok', 'short_video', '请为以下产品写一个15-30秒的TikTok短视频脚本：{product_name}', '【开头hook】你还在用普通的...', 892, '视频'),
('Instagram 轮播图文案', 'instagram', 'carousel', '请为以下主题写5页Instagram轮播图文案：{topic}', '第1页：标题引入\n第2页：痛点...', 654, '图文'),
('Amazon 产品描述', 'amazon', 'article', '请为以下产品写Amazon产品描述，包含bullet points：{product_name}', '【产品亮点】\n✅ 超轻便携...', 543, '产品'),
('品牌故事模板', 'independent', 'article', '请根据以下信息写一个品牌故事：品牌名{brand}，创始故事{story}', '每一个伟大的品牌，都始于一个简单的想法...', 321, '品牌'),
('促销活动页文案', 'shopify', 'article', '请为{event_name}写一个促销活动页文案', '🔥限时特惠，错过再等一年！...', 234, '促销'),
('小红书测评笔记', 'xiaohongshu', 'carousel', '请为{product_name}写一篇对比测评笔记', '今天来做一期{category}大测评...', 789, '测评'),
('TikTok 挑战赛脚本', 'tiktok', 'short_video', '请设计一个TikTok挑战赛脚本，主题：{challenge_theme}', '【挑战名】#超级变变变\n【规则】...', 456, '活动');

-- ============================================
-- 5. Products
-- ============================================
INSERT INTO products (name, sku, price, stock, status, seo_score, category, platform) VALUES
('轻薄冰丝防晒衣 UPF50+', 'FSY-001', 89.00, 2560, 'active', 82, '服饰', 'shopify'),
('迷你便携USB风扇', 'FAN-001', 39.90, 1800, 'active', 75, '3C数码', 'amazon'),
('无线蓝牙耳机 Pro', 'EAR-001', 199.00, 890, 'active', 91, '3C数码', 'amazon'),
('瑜伽健身裤 高腰款', 'YGA-001', 129.00, 1200, 'active', 68, '运动', 'shopify'),
('车载香薰扩散器', 'CAR-001', 59.00, 450, 'active', 55, '汽车用品', 'shopify'),
('宠物自动喂食器 5L', 'PET-001', 239.00, 320, 'active', 88, '宠物用品', 'amazon'),
('防蓝光眼镜 TR90', 'GLS-001', 49.00, 3200, 'active', 42, '配饰', 'independent'),
('便携榨汁杯 400ml', 'JCR-001', 79.00, 1560, 'active', 73, '家居生活', 'shopify'),
('ins风透明手机壳', 'PHN-001', 29.00, 5600, 'active', 38, '配饰', 'independent'),
('户外折叠露营椅', 'CMP-001', 159.00, 280, 'out_of_stock', 65, '户外', 'amazon'),
('夏季冰丝袖套 2双装', 'SLV-001', 19.90, 8900, 'active', 51, '服饰', 'tiktok'),
('挂脖式迷你风扇', 'FAN-002', 69.00, 0, 'out_of_stock', 79, '3C数码', 'tiktok');

-- ============================================
-- 6. Social Accounts
-- ============================================
INSERT INTO social_accounts (platform, handle, display_name, avatar_url, followers, connected, last_synced_at) VALUES
('tiktok', '@brandmind_official', 'BrandMind 官方', null, 125000, true, NOW() - INTERVAL '1 hour'),
('instagram', '@brandmind.ai', 'BrandMind AI', null, 45600, true, NOW() - INTERVAL '2 hours'),
('xiaohongshu', 'BrandMind品牌工坊', 'BrandMind品牌工坊', null, 32800, true, NOW() - INTERVAL '30 minutes'),
('amazon', 'BrandMind Store', 'BrandMind Store', null, 8900, true, NOW() - INTERVAL '3 hours'),
('shopify', 'brandmind.myshopify.com', 'BrandMind Shop', null, 0, true, NOW() - INTERVAL '1 hour'),
('instagram', '@brandmind.lifestyle', 'BrandMind 生活', null, 12300, false, null);

-- ============================================
-- 7. Scheduled Posts
-- ============================================
INSERT INTO scheduled_posts (content_preview, platform, scheduled_at, status, published_at) VALUES
('夏日清凉穿搭分享 ☀️ 三套不重样的搭配', 'xiaohongshu', NOW() + INTERVAL '2 hours', 'queued', null),
('便携风扇开箱测评 🌀 这个夏天必备', 'tiktok', NOW() + INTERVAL '5 hours', 'queued', null),
('新品上架预告：冰丝系列 🧊', 'instagram', NOW() + INTERVAL '1 day', 'queued', null),
('618大促倒计时海报', 'xiaohongshu', NOW() + INTERVAL '2 days', 'draft', null),
('品牌故事系列第3期', 'instagram', NOW() + INTERVAL '3 days', 'draft', null),
('周末穿搭灵感 | 城市户外风', 'xiaohongshu', NOW() - INTERVAL '1 day', 'published', NOW() - INTERVAL '1 day'),
('耳机盲测挑战赛 🎧', 'tiktok', NOW() - INTERVAL '2 days', 'published', NOW() - INTERVAL '2 days'),
('防晒衣5款横评', 'tiktok', NOW() - INTERVAL '3 days', 'published', NOW() - INTERVAL '3 days'),
('Shopify店铺优化技巧', 'instagram', NOW() + INTERVAL '6 hours', 'queued', null),
('宠物喂食器使用教程', 'tiktok', NOW() - INTERVAL '12 hours', 'failed', null);

-- ============================================
-- 8. Skill Packs
-- ============================================
INSERT INTO skill_packs (title, description, category, difficulty, icon, usage_count, tags, steps, prompts) VALUES
('TikTok 短视频运营入门', '从0到1学会TikTok短视频运营，包含账号搭建、内容策划、拍摄剪辑全流程', 'content', 'beginner', 'Video', 3456, ARRAY['TikTok', '短视频', '入门'],
 '[{"order":1,"title":"账号定位","description":"确定账号人设和内容方向"},{"order":2,"title":"内容策划","description":"制定内容日历和选题库"},{"order":3,"title":"拍摄技巧","description":"学习基础拍摄和布光"},{"order":4,"title":"剪辑发布","description":"使用剪映完成后期制作"}]',
 '[{"name":"短视频脚本生成","template":"帮我写一个关于{topic}的TikTok短视频脚本，时长{duration}秒"}]'),
('小红书爆款笔记写作', '掌握小红书种草笔记的写作技巧，提升笔记互动率和转化率', 'content', 'intermediate', 'BookOpen', 2890, ARRAY['小红书', '种草', '文案'],
 '[{"order":1,"title":"标题优化","description":"掌握高点击率标题写法"},{"order":2,"title":"首图设计","description":"制作吸引人的封面图"},{"order":3,"title":"正文结构","description":"痛点+解决方案+产品推荐"},{"order":4,"title":"标签策略","description":"选择高流量精准标签"}]',
 '[{"name":"种草笔记生成","template":"为{product}写一篇小红书种草笔记，突出{features}"}]'),
('Shopify 独立站 SEO 优化', '系统学习Shopify店铺SEO优化，提升自然搜索流量', 'seo', 'intermediate', 'Search', 1567, ARRAY['SEO', 'Shopify', '独立站'],
 '[{"order":1,"title":"关键词研究","description":"使用工具找到高价值关键词"},{"order":2,"title":"页面优化","description":"优化标题、描述和H标签"},{"order":3,"title":"产品页SEO","description":"优化产品页面元素"},{"order":4,"title":"技术SEO","description":"网站速度和结构优化"}]',
 '[{"name":"SEO标题生成","template":"为{product}生成SEO优化的产品标题，包含关键词{keywords}"}]'),
('Facebook/Instagram 广告投放', '从零开始学习Meta广告投放，掌握受众定向和素材优化', 'ads', 'advanced', 'Target', 987, ARRAY['广告', 'Facebook', 'Instagram'],
 '[{"order":1,"title":"广告账户设置","description":"Business Manager配置"},{"order":2,"title":"受众定向","description":"核心受众和相似受众"},{"order":3,"title":"素材制作","description":"高转化广告素材要素"},{"order":4,"title":"数据分析","description":"ROAS优化和归因分析"}]',
 '[{"name":"广告文案生成","template":"为{product}写一段Facebook广告文案，目标受众{audience}"}]'),
('品牌定位与策略', '帮助新品牌完成从0到1的品牌定位和策略制定', 'operations', 'beginner', 'Compass', 2345, ARRAY['品牌', '定位', '策略'],
 '[{"order":1,"title":"市场分析","description":"分析目标市场和竞争格局"},{"order":2,"title":"用户画像","description":"定义核心目标用户"},{"order":3,"title":"品牌定位","description":"确定差异化定位"},{"order":4,"title":"品牌视觉","description":"Logo、色彩和视觉系统"}]',
 '[{"name":"品牌定位分析","template":"帮我分析{category}市场，为品牌{brand}制定差异化定位"}]'),
('电商客服话术大全', '常见客服场景话术模板，提升客户满意度和复购率', 'service', 'beginner', 'MessageCircle', 1890, ARRAY['客服', '话术', '售后'],
 '[{"order":1,"title":"售前咨询","description":"产品咨询和推荐话术"},{"order":2,"title":"订单处理","description":"发货、物流查询话术"},{"order":3,"title":"售后处理","description":"退换货和投诉处理"},{"order":4,"title":"客户维护","description":"复购引导和会员维护"}]',
 '[{"name":"客服回复生成","template":"客户反馈：{feedback}，请生成一段专业友好的客服回复"}]'),
('Amazon Listing 优化', '系统优化Amazon产品listing，提升搜索排名和转化率', 'seo', 'advanced', 'ShoppingBag', 1234, ARRAY['Amazon', 'Listing', '优化'],
 '[{"order":1,"title":"标题优化","description":"关键词布局和标题结构"},{"order":2,"title":"五点描述","description":"Bullet Points写作技巧"},{"order":3,"title":"A+页面","description":"品牌内容页设计"},{"order":4,"title":"评价管理","description":"获取和管理产品评价"}]',
 '[{"name":"Listing生成","template":"为{product}写Amazon Listing，包含标题和5个bullet points"}]'),
('社媒内容日历规划', '学会制定高效的社媒内容日历，保持稳定的发布节奏', 'operations', 'beginner', 'Calendar', 2100, ARRAY['社媒', '日历', '规划'],
 '[{"order":1,"title":"平台选择","description":"根据品牌选择核心平台"},{"order":2,"title":"内容主题","description":"制定周/月内容主题"},{"order":3,"title":"发布节奏","description":"确定最佳发布时间和频率"},{"order":4,"title":"数据复盘","description":"分析数据优化策略"}]',
 '[{"name":"内容日历生成","template":"为{brand}制定下周的{platform}内容发布计划，产品重点：{focus}"}]'),
('直播带货全流程', '从直播策划到复盘的完整SOP，适合新手主播', 'content', 'intermediate', 'Radio', 1678, ARRAY['直播', '带货', 'SOP'],
 '[{"order":1,"title":"直播策划","description":"主题、产品和流程规划"},{"order":2,"title":"话术准备","description":"开场、产品讲解和促单话术"},{"order":3,"title":"直播执行","description":"互动技巧和节奏控制"},{"order":4,"title":"数据复盘","description":"GMV、转化率和互动分析"}]',
 '[{"name":"直播脚本生成","template":"为{product}写一段直播带货话术，突出{selling_points}"}]'),
('跨境电商选品方法论', '数据驱动的选品方法，找到高潜力低竞争产品', 'operations', 'intermediate', 'TrendingUp', 1456, ARRAY['选品', '跨境', '方法论'],
 '[{"order":1,"title":"市场调研","description":"使用工具分析市场容量"},{"order":2,"title":"竞品分析","description":"分析竞品定价和评价"},{"order":3,"title":"利润测算","description":"计算成本和利润空间"},{"order":4,"title":"供应链","description":"找到可靠供应商"}]',
 '[{"name":"选品分析","template":"分析{category}品类在{platform}上的市场机会，包含竞争度和利润率"}]'),
('Instagram Reels 创意指南', '掌握Reels算法和创意技巧，快速涨粉', 'content', 'beginner', 'Film', 1890, ARRAY['Instagram', 'Reels', '涨粉'],
 '[{"order":1,"title":"算法理解","description":"Reels推荐机制解析"},{"order":2,"title":"创意策划","description":"热门Reels类型和模板"},{"order":3,"title":"拍摄剪辑","description":"竖屏拍摄和转场技巧"},{"order":4,"title":"发布优化","description":"标签、音乐和发布时间"}]',
 '[{"name":"Reels脚本","template":"为{brand}写一个Instagram Reels脚本，主题：{topic}，时长15秒"}]'),
('DTC品牌邮件营销', '建立高转化的邮件营销体系，提升客户生命周期价值', 'ads', 'intermediate', 'Mail', 876, ARRAY['邮件', 'DTC', '营销'],
 '[{"order":1,"title":"列表建设","description":"获取和管理邮件订阅者"},{"order":2,"title":"欢迎序列","description":"设计自动欢迎邮件流"},{"order":3,"title":"促销邮件","description":"高转化促销邮件写作"},{"order":4,"title":"弃购挽回","description":"弃购邮件自动化流程"}]',
 '[{"name":"邮件文案","template":"为{brand}写一封{type}邮件，产品：{product}，优惠：{offer}"}]');
