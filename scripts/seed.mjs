import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://padvtykpcwpqrduwbhiv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZHZ0eWtwY3dwcXJkdXdiaGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTgyOTUsImV4cCI6MjA5MDIzNDI5NX0.vOcelSJztQ7twdyhdKMXwykb4Y6AeaDjklVSwr77KgA"
);

async function seed() {
  console.log("Seeding hot_products...");
  const { error: e1 } = await supabase.from("hot_products").insert([
    { name: "迷你便携风扇", platform: "tiktok", category: "3C数码", sales_volume: 52340, growth_rate: 23.5, trend: "up", price_range: "¥29-59", rating: 4.7 },
    { name: "冰丝防晒衣", platform: "xiaohongshu", category: "服饰", sales_volume: 38920, growth_rate: 45.2, trend: "up", price_range: "¥69-129", rating: 4.8 },
    { name: "便携榨汁杯", platform: "amazon", category: "家居生活", sales_volume: 28450, growth_rate: 12.3, trend: "up", price_range: "¥59-99", rating: 4.5 },
    { name: "瑜伽裤", platform: "instagram", category: "运动", sales_volume: 42100, growth_rate: 8.7, trend: "up", price_range: "¥89-169", rating: 4.6 },
    { name: "车载香薰", platform: "shopify", category: "汽车用品", sales_volume: 15600, growth_rate: -3.2, trend: "down", price_range: "¥39-79", rating: 4.3 },
    { name: "无线耳机", platform: "amazon", category: "3C数码", sales_volume: 67800, growth_rate: 5.1, trend: "up", price_range: "¥99-299", rating: 4.4 },
    { name: "防蓝光眼镜", platform: "tiktok", category: "配饰", sales_volume: 31200, growth_rate: 67.8, trend: "up", price_range: "¥29-69", rating: 4.2 },
    { name: "宠物自动喂食器", platform: "shopify", category: "宠物用品", sales_volume: 18900, growth_rate: 34.5, trend: "up", price_range: "¥129-299", rating: 4.6 },
    { name: "夏季冰袖", platform: "xiaohongshu", category: "服饰", sales_volume: 45600, growth_rate: 52.1, trend: "up", price_range: "¥19-39", rating: 4.5 },
    { name: "便携挂脖风扇", platform: "tiktok", category: "3C数码", sales_volume: 38700, growth_rate: 89.3, trend: "up", price_range: "¥49-99", rating: 4.3 },
    { name: "ins风手机壳", platform: "instagram", category: "配饰", sales_volume: 22300, growth_rate: 15.6, trend: "up", price_range: "¥19-49", rating: 4.1 },
    { name: "露营折叠椅", platform: "amazon", category: "户外", sales_volume: 12800, growth_rate: -1.5, trend: "down", price_range: "¥79-199", rating: 4.7 },
  ]);
  if (e1) console.error("hot_products error:", e1.message);
  else console.log("  ✓ hot_products");

  console.log("Seeding competitors...");
  const { error: e2 } = await supabase.from("competitors").insert([
    { name: "花西子", platform: "xiaohongshu", monthly_sales: 850000, price_range: "¥89-399", rating: 4.8, new_product_frequency: "每月2-3款" },
    { name: "小米", platform: "amazon", monthly_sales: 2300000, price_range: "¥49-4999", rating: 4.6, new_product_frequency: "每周1-2款" },
    { name: "三只松鼠", platform: "tiktok", monthly_sales: 1200000, price_range: "¥9-199", rating: 4.5, new_product_frequency: "每月5-8款" },
    { name: "MUJI", platform: "shopify", monthly_sales: 560000, price_range: "¥29-999", rating: 4.7, new_product_frequency: "每季10-15款" },
    { name: "完美日记", platform: "xiaohongshu", monthly_sales: 980000, price_range: "¥39-199", rating: 4.4, new_product_frequency: "每月3-5款" },
    { name: "Anker", platform: "amazon", monthly_sales: 1800000, price_range: "¥59-599", rating: 4.8, new_product_frequency: "每月1-2款" },
    { name: "元气森林", platform: "tiktok", monthly_sales: 750000, price_range: "¥5-39", rating: 4.3, new_product_frequency: "每季2-3款" },
    { name: "网易严选", platform: "shopify", monthly_sales: 430000, price_range: "¥19-1999", rating: 4.6, new_product_frequency: "每周3-5款" },
  ]);
  if (e2) console.error("competitors error:", e2.message);
  else console.log("  ✓ competitors");

  console.log("Seeding contents...");
  const now = new Date();
  const { error: e3 } = await supabase.from("contents").insert([
    { title: "夏日清凉穿搭 | 3套不重样", body: "今天给大家分享三套夏日清凉穿搭...", platform: "xiaohongshu", content_type: "image_post", status: "published", views: 12500, likes: 890, comments: 156, shares: 234, tags: ["穿搭", "夏季", "清凉"], published_at: new Date(now - 2 * 86400000).toISOString() },
    { title: "这个风扇也太好用了吧！", body: "最近发现了一个超好用的迷你风扇...", platform: "tiktok", content_type: "short_video", status: "published", views: 89000, likes: 5600, comments: 890, shares: 1200, tags: ["好物推荐", "风扇", "夏天"], published_at: new Date(now - 86400000).toISOString() },
    { title: "Shopify店铺首页优化指南", body: "如何让你的Shopify首页转化率翻倍...", platform: "independent", content_type: "article", status: "published", views: 3400, likes: 234, comments: 67, shares: 89, tags: ["Shopify", "SEO", "转化率"], published_at: new Date(now - 3 * 86400000).toISOString() },
    { title: "防晒衣测评 | 5款热门对比", body: "夏天到了防晒衣该怎么选...", platform: "xiaohongshu", content_type: "carousel", status: "scheduled", views: 0, likes: 0, comments: 0, shares: 0, tags: ["防晒", "测评", "夏季"], scheduled_at: new Date(now.getTime() + 86400000).toISOString() },
    { title: "直播预告：618大促专场", body: "明天晚上8点准时开播...", platform: "tiktok", content_type: "short_video", status: "scheduled", views: 0, likes: 0, comments: 0, shares: 0, tags: ["618", "直播", "大促"], scheduled_at: new Date(now.getTime() + 2 * 86400000).toISOString() },
    { title: "Amazon选品思路分享", body: "今天聊聊我是怎么在Amazon上选品的...", platform: "instagram", content_type: "carousel", status: "published", views: 6700, likes: 456, comments: 123, shares: 78, tags: ["Amazon", "选品", "跨境电商"], published_at: new Date(now - 5 * 86400000).toISOString() },
    { title: "宠物喂食器开箱测评", body: "收到了最新款的自动喂食器...", platform: "tiktok", content_type: "short_video", status: "pending", views: 0, likes: 0, comments: 0, shares: 0, tags: ["宠物", "开箱", "好物"] },
    { title: "新品上架预告 | 春季系列", body: "春季新品即将上线...", platform: "instagram", content_type: "image_post", status: "draft", views: 0, likes: 0, comments: 0, shares: 0, tags: ["新品", "春季", "预告"] },
    { title: "如何打造爆款产品页", body: "产品页是转化的关键...", platform: "independent", content_type: "article", status: "published", views: 4500, likes: 312, comments: 89, shares: 56, tags: ["产品页", "转化", "电商"], published_at: new Date(now - 7 * 86400000).toISOString() },
    { title: "冰丝防晒衣穿搭合集", body: "最近入手了几件冰丝防晒衣...", platform: "xiaohongshu", content_type: "image_post", status: "published", views: 23400, likes: 1560, comments: 345, shares: 567, tags: ["防晒衣", "穿搭", "冰丝"], published_at: new Date(now - 4 * 86400000).toISOString() },
    { title: "耳机音质盲测挑战", body: "找了5个朋友来盲测耳机音质...", platform: "tiktok", content_type: "short_video", status: "published", views: 156000, likes: 12300, comments: 2340, shares: 3450, tags: ["耳机", "盲测", "3C"], published_at: new Date(now - 6 * 86400000).toISOString() },
    { title: "品牌故事 | 我们为什么做这个品牌", body: "每个品牌都有一个故事...", platform: "instagram", content_type: "article", status: "draft", views: 0, likes: 0, comments: 0, shares: 0, tags: ["品牌故事", "创业"] },
  ]);
  if (e3) console.error("contents error:", e3.message);
  else console.log("  ✓ contents");

  console.log("Seeding content_templates...");
  const { error: e4 } = await supabase.from("content_templates").insert([
    { name: "小红书种草笔记", platform: "xiaohongshu", content_type: "image_post", prompt_template: "请为以下产品写一篇小红书种草笔记：{product_name}", example_output: "今天给姐妹们安利一个超好用的...", usage_count: 1256, category: "种草" },
    { name: "TikTok 短视频脚本", platform: "tiktok", content_type: "short_video", prompt_template: "请为以下产品写一个15-30秒的TikTok短视频脚本：{product_name}", example_output: "【开头hook】你还在用普通的...", usage_count: 892, category: "视频" },
    { name: "Instagram 轮播图文案", platform: "instagram", content_type: "carousel", prompt_template: "请为以下主题写5页Instagram轮播图文案：{topic}", example_output: "第1页：标题引入...", usage_count: 654, category: "图文" },
    { name: "Amazon 产品描述", platform: "amazon", content_type: "article", prompt_template: "请为以下产品写Amazon产品描述：{product_name}", example_output: "【产品亮点】✅ 超轻便携...", usage_count: 543, category: "产品" },
    { name: "品牌故事模板", platform: "independent", content_type: "article", prompt_template: "请根据以下信息写一个品牌故事：{brand}", example_output: "每一个伟大的品牌...", usage_count: 321, category: "品牌" },
    { name: "促销活动页文案", platform: "shopify", content_type: "article", prompt_template: "请为{event_name}写一个促销活动页文案", example_output: "🔥限时特惠...", usage_count: 234, category: "促销" },
    { name: "小红书测评笔记", platform: "xiaohongshu", content_type: "carousel", prompt_template: "请为{product_name}写一篇对比测评笔记", example_output: "今天来做一期大测评...", usage_count: 789, category: "测评" },
    { name: "TikTok 挑战赛脚本", platform: "tiktok", content_type: "short_video", prompt_template: "请设计一个TikTok挑战赛脚本：{theme}", example_output: "【挑战名】#超级变变变...", usage_count: 456, category: "活动" },
  ]);
  if (e4) console.error("content_templates error:", e4.message);
  else console.log("  ✓ content_templates");

  console.log("Seeding products...");
  const { error: e5 } = await supabase.from("products").insert([
    { name: "轻薄冰丝防晒衣 UPF50+", sku: "FSY-001", price: 89.00, stock: 2560, status: "active", seo_score: 82, category: "服饰", platform: "shopify" },
    { name: "迷你便携USB风扇", sku: "FAN-001", price: 39.90, stock: 1800, status: "active", seo_score: 75, category: "3C数码", platform: "amazon" },
    { name: "无线蓝牙耳机 Pro", sku: "EAR-001", price: 199.00, stock: 890, status: "active", seo_score: 91, category: "3C数码", platform: "amazon" },
    { name: "瑜伽健身裤 高腰款", sku: "YGA-001", price: 129.00, stock: 1200, status: "active", seo_score: 68, category: "运动", platform: "shopify" },
    { name: "车载香薰扩散器", sku: "CAR-001", price: 59.00, stock: 450, status: "active", seo_score: 55, category: "汽车用品", platform: "shopify" },
    { name: "宠物自动喂食器 5L", sku: "PET-001", price: 239.00, stock: 320, status: "active", seo_score: 88, category: "宠物用品", platform: "amazon" },
    { name: "防蓝光眼镜 TR90", sku: "GLS-001", price: 49.00, stock: 3200, status: "active", seo_score: 42, category: "配饰", platform: "independent" },
    { name: "便携榨汁杯 400ml", sku: "JCR-001", price: 79.00, stock: 1560, status: "active", seo_score: 73, category: "家居生活", platform: "shopify" },
    { name: "ins风透明手机壳", sku: "PHN-001", price: 29.00, stock: 5600, status: "active", seo_score: 38, category: "配饰", platform: "independent" },
    { name: "户外折叠露营椅", sku: "CMP-001", price: 159.00, stock: 280, status: "out_of_stock", seo_score: 65, category: "户外", platform: "amazon" },
    { name: "夏季冰丝袖套 2双装", sku: "SLV-001", price: 19.90, stock: 8900, status: "active", seo_score: 51, category: "服饰", platform: "tiktok" },
    { name: "挂脖式迷你风扇", sku: "FAN-002", price: 69.00, stock: 0, status: "out_of_stock", seo_score: 79, category: "3C数码", platform: "tiktok" },
  ]);
  if (e5) console.error("products error:", e5.message);
  else console.log("  ✓ products");

  console.log("Seeding social_accounts...");
  const { error: e6 } = await supabase.from("social_accounts").insert([
    { platform: "tiktok", handle: "@brandmind_official", display_name: "BrandMind 官方", followers: 125000, connected: true, last_synced_at: new Date().toISOString() },
    { platform: "instagram", handle: "@brandmind.ai", display_name: "BrandMind AI", followers: 45600, connected: true, last_synced_at: new Date().toISOString() },
    { platform: "xiaohongshu", handle: "BrandMind品牌工坊", display_name: "BrandMind品牌工坊", followers: 32800, connected: true, last_synced_at: new Date().toISOString() },
    { platform: "amazon", handle: "BrandMind Store", display_name: "BrandMind Store", followers: 8900, connected: true, last_synced_at: new Date().toISOString() },
    { platform: "shopify", handle: "brandmind.myshopify.com", display_name: "BrandMind Shop", followers: 0, connected: true, last_synced_at: new Date().toISOString() },
    { platform: "instagram", handle: "@brandmind.lifestyle", display_name: "BrandMind 生活", followers: 12300, connected: false },
  ]);
  if (e6) console.error("social_accounts error:", e6.message);
  else console.log("  ✓ social_accounts");

  console.log("Seeding scheduled_posts...");
  const { error: e7 } = await supabase.from("scheduled_posts").insert([
    { content_preview: "夏日清凉穿搭分享 ☀️ 三套不重样的搭配", platform: "xiaohongshu", scheduled_at: new Date(now.getTime() + 2 * 3600000).toISOString(), status: "queued" },
    { content_preview: "便携风扇开箱测评 🌀 这个夏天必备", platform: "tiktok", scheduled_at: new Date(now.getTime() + 5 * 3600000).toISOString(), status: "queued" },
    { content_preview: "新品上架预告：冰丝系列 🧊", platform: "instagram", scheduled_at: new Date(now.getTime() + 86400000).toISOString(), status: "queued" },
    { content_preview: "618大促倒计时海报", platform: "xiaohongshu", scheduled_at: new Date(now.getTime() + 2 * 86400000).toISOString(), status: "draft" },
    { content_preview: "品牌故事系列第3期", platform: "instagram", scheduled_at: new Date(now.getTime() + 3 * 86400000).toISOString(), status: "draft" },
    { content_preview: "周末穿搭灵感 | 城市户外风", platform: "xiaohongshu", scheduled_at: new Date(now.getTime() - 86400000).toISOString(), status: "published", published_at: new Date(now.getTime() - 86400000).toISOString() },
    { content_preview: "耳机盲测挑战赛 🎧", platform: "tiktok", scheduled_at: new Date(now.getTime() - 2 * 86400000).toISOString(), status: "published", published_at: new Date(now.getTime() - 2 * 86400000).toISOString() },
    { content_preview: "防晒衣5款横评", platform: "tiktok", scheduled_at: new Date(now.getTime() - 3 * 86400000).toISOString(), status: "published", published_at: new Date(now.getTime() - 3 * 86400000).toISOString() },
    { content_preview: "Shopify店铺优化技巧", platform: "instagram", scheduled_at: new Date(now.getTime() + 6 * 3600000).toISOString(), status: "queued" },
    { content_preview: "宠物喂食器使用教程", platform: "tiktok", scheduled_at: new Date(now.getTime() - 12 * 3600000).toISOString(), status: "failed" },
  ]);
  if (e7) console.error("scheduled_posts error:", e7.message);
  else console.log("  ✓ scheduled_posts");

  console.log("Seeding skill_packs...");
  const { error: e8 } = await supabase.from("skill_packs").insert([
    { title: "TikTok 短视频运营入门", description: "从0到1学会TikTok短视频运营，包含账号搭建、内容策划、拍摄剪辑全流程", category: "content", difficulty: "beginner", icon: "Video", usage_count: 3456, tags: ["TikTok", "短视频", "入门"], steps: [{ order: 1, title: "账号定位", description: "确定账号人设和内容方向" }, { order: 2, title: "内容策划", description: "制定内容日历和选题库" }, { order: 3, title: "拍摄技巧", description: "学习基础拍摄和布光" }, { order: 4, title: "剪辑发布", description: "使用剪映完成后期制作" }] },
    { title: "小红书爆款笔记写作", description: "掌握小红书种草笔记的写作技巧，提升笔记互动率和转化率", category: "content", difficulty: "intermediate", icon: "BookOpen", usage_count: 2890, tags: ["小红书", "种草", "文案"], steps: [{ order: 1, title: "标题优化", description: "掌握高点击率标题写法" }, { order: 2, title: "首图设计", description: "制作吸引人的封面图" }, { order: 3, title: "正文结构", description: "痛点+解决方案+产品推荐" }, { order: 4, title: "标签策略", description: "选择高流量精准标签" }] },
    { title: "Shopify 独立站 SEO 优化", description: "系统学习Shopify店铺SEO优化，提升自然搜索流量", category: "seo", difficulty: "intermediate", icon: "Search", usage_count: 1567, tags: ["SEO", "Shopify", "独立站"], steps: [{ order: 1, title: "关键词研究", description: "使用工具找到高价值关键词" }, { order: 2, title: "页面优化", description: "优化标题、描述和H标签" }, { order: 3, title: "产品页SEO", description: "优化产品页面元素" }, { order: 4, title: "技术SEO", description: "网站速度和结构优化" }] },
    { title: "Facebook/Instagram 广告投放", description: "从零开始学习Meta广告投放，掌握受众定向和素材优化", category: "ads", difficulty: "advanced", icon: "Target", usage_count: 987, tags: ["广告", "Facebook", "Instagram"], steps: [{ order: 1, title: "广告账户设置", description: "Business Manager配置" }, { order: 2, title: "受众定向", description: "核心受众和相似受众" }, { order: 3, title: "素材制作", description: "高转化广告素材要素" }, { order: 4, title: "数据分析", description: "ROAS优化和归因分析" }] },
    { title: "品牌定位与策略", description: "帮助新品牌完成从0到1的品牌定位和策略制定", category: "operations", difficulty: "beginner", icon: "Compass", usage_count: 2345, tags: ["品牌", "定位", "策略"], steps: [{ order: 1, title: "市场分析", description: "分析目标市场和竞争格局" }, { order: 2, title: "用户画像", description: "定义核心目标用户" }, { order: 3, title: "品牌定位", description: "确定差异化定位" }, { order: 4, title: "品牌视觉", description: "Logo、色彩和视觉系统" }] },
    { title: "电商客服话术大全", description: "常见客服场景话术模板，提升客户满意度和复购率", category: "service", difficulty: "beginner", icon: "MessageCircle", usage_count: 1890, tags: ["客服", "话术", "售后"], steps: [{ order: 1, title: "售前咨询", description: "产品咨询和推荐话术" }, { order: 2, title: "订单处理", description: "发货、物流查询话术" }, { order: 3, title: "售后处理", description: "退换货和投诉处理" }, { order: 4, title: "客户维护", description: "复购引导和会员维护" }] },
    { title: "Amazon Listing 优化", description: "系统优化Amazon产品listing，提升搜索排名和转化率", category: "seo", difficulty: "advanced", icon: "ShoppingBag", usage_count: 1234, tags: ["Amazon", "Listing", "优化"], steps: [{ order: 1, title: "标题优化", description: "关键词布局和标题结构" }, { order: 2, title: "五点描述", description: "Bullet Points写作技巧" }, { order: 3, title: "A+页面", description: "品牌内容页设计" }, { order: 4, title: "评价管理", description: "获取和管理产品评价" }] },
    { title: "社媒内容日历规划", description: "学会制定高效的社媒内容日历，保持稳定的发布节奏", category: "operations", difficulty: "beginner", icon: "Calendar", usage_count: 2100, tags: ["社媒", "日历", "规划"], steps: [{ order: 1, title: "平台选择", description: "根据品牌选择核心平台" }, { order: 2, title: "内容主题", description: "制定周/月内容主题" }, { order: 3, title: "发布节奏", description: "确定最佳发布时间和频率" }, { order: 4, title: "数据复盘", description: "分析数据优化策略" }] },
    { title: "直播带货全流程", description: "从直播策划到复盘的完整SOP，适合新手主播", category: "content", difficulty: "intermediate", icon: "Radio", usage_count: 1678, tags: ["直播", "带货", "SOP"], steps: [{ order: 1, title: "直播策划", description: "主题、产品和流程规划" }, { order: 2, title: "话术准备", description: "开场、产品讲解和促单话术" }, { order: 3, title: "直播执行", description: "互动技巧和节奏控制" }, { order: 4, title: "数据复盘", description: "GMV、转化率和互动分析" }] },
    { title: "跨境电商选品方法论", description: "数据驱动的选品方法，找到高潜力低竞争产品", category: "operations", difficulty: "intermediate", icon: "TrendingUp", usage_count: 1456, tags: ["选品", "跨境", "方法论"], steps: [{ order: 1, title: "市场调研", description: "使用工具分析市场容量" }, { order: 2, title: "竞品分析", description: "分析竞品定价和评价" }, { order: 3, title: "利润测算", description: "计算成本和利润空间" }, { order: 4, title: "供应链", description: "找到可靠供应商" }] },
    { title: "Instagram Reels 创意指南", description: "掌握Reels算法和创意技巧，快速涨粉", category: "content", difficulty: "beginner", icon: "Film", usage_count: 1890, tags: ["Instagram", "Reels", "涨粉"], steps: [{ order: 1, title: "算法理解", description: "Reels推荐机制解析" }, { order: 2, title: "创意策划", description: "热门Reels类型和模板" }, { order: 3, title: "拍摄剪辑", description: "竖屏拍摄和转场技巧" }, { order: 4, title: "发布优化", description: "标签、音乐和发布时间" }] },
    { title: "DTC品牌邮件营销", description: "建立高转化的邮件营销体系，提升客户生命周期价值", category: "ads", difficulty: "intermediate", icon: "Mail", usage_count: 876, tags: ["邮件", "DTC", "营销"], steps: [{ order: 1, title: "列表建设", description: "获取和管理邮件订阅者" }, { order: 2, title: "欢迎序列", description: "设计自动欢迎邮件流" }, { order: 3, title: "促销邮件", description: "高转化促销邮件写作" }, { order: 4, title: "弃购挽回", description: "弃购邮件自动化流程" }] },
  ]);
  if (e8) console.error("skill_packs error:", e8.message);
  else console.log("  ✓ skill_packs");

  console.log("\n✅ Seed complete!");
}

seed().catch(console.error);
