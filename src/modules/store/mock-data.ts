import { KPIData } from "@/lib/types";
import { Product, SEOScore, StoreHealth } from "./types";

export const storeKPIs: KPIData[] = [
  { label: "店铺健康分", value: 85, trend: "up", trendPercent: 3.2, icon: "HeartPulse", format: "number" },
  { label: "SEO 得分", value: 72, trend: "up", trendPercent: 5.8, icon: "Search", format: "number" },
  { label: "商品总数", value: 128, trend: "up", trendPercent: 6.3, icon: "Package", format: "number" },
  { label: "本月转化率", value: 3.2, trend: "down", trendPercent: -0.4, icon: "TrendingUp", format: "percent" },
];

export const mockProducts: Product[] = [
  {
    id: "p1", name: "无线蓝牙耳机 Pro", sku: "BT-EAR-001", price: 299, stock: 450,
    status: "active", seo_score: 92, category: "数码配件", platform: "shopify",
    created_at: "2026-01-15T08:00:00Z", updated_at: "2026-03-20T10:00:00Z",
  },
  {
    id: "p2", name: "便携式迷你风扇", sku: "FAN-MINI-002", price: 59, stock: 1200,
    status: "active", seo_score: 78, category: "生活家电", platform: "tiktok",
    created_at: "2026-02-01T08:00:00Z", updated_at: "2026-03-18T10:00:00Z",
  },
  {
    id: "p3", name: "天然植物精油套装", sku: "OIL-SET-003", price: 168, stock: 320,
    status: "active", seo_score: 85, category: "美妆护肤", platform: "xiaohongshu",
    created_at: "2026-01-20T08:00:00Z", updated_at: "2026-03-19T10:00:00Z",
  },
  {
    id: "p4", name: "复古机械键盘", sku: "KB-MECH-004", price: 459, stock: 0,
    status: "out_of_stock", seo_score: 65, category: "数码配件", platform: "amazon",
    created_at: "2026-01-10T08:00:00Z", updated_at: "2026-03-15T10:00:00Z",
  },
  {
    id: "p5", name: "春季碎花连衣裙", sku: "DR-FLOR-005", price: 189, stock: 580,
    status: "active", seo_score: 88, category: "女装", platform: "shopify",
    created_at: "2026-02-14T08:00:00Z", updated_at: "2026-03-22T10:00:00Z",
  },
  {
    id: "p6", name: "智能手环运动版", sku: "BAND-SPT-006", price: 199, stock: 230,
    status: "pending_review", seo_score: 45, category: "数码配件", platform: "amazon",
    created_at: "2026-03-01T08:00:00Z", updated_at: "2026-03-25T10:00:00Z",
  },
  {
    id: "p7", name: "有机抹茶粉礼盒", sku: "TEA-MTH-007", price: 128, stock: 860,
    status: "active", seo_score: 71, category: "食品饮料", platform: "xiaohongshu",
    created_at: "2026-02-10T08:00:00Z", updated_at: "2026-03-21T10:00:00Z",
  },
  {
    id: "p8", name: "儿童益智积木套装", sku: "TOY-BLK-008", price: 89, stock: 1500,
    status: "active", seo_score: 82, category: "母婴玩具", platform: "tiktok",
    created_at: "2026-01-25T08:00:00Z", updated_at: "2026-03-17T10:00:00Z",
  },
  {
    id: "p9", name: "极简主义帆布包", sku: "BAG-CNV-009", price: 79, stock: 40,
    status: "inactive", seo_score: 38, category: "箱包配饰", platform: "independent",
    created_at: "2025-12-01T08:00:00Z", updated_at: "2026-02-28T10:00:00Z",
  },
  {
    id: "p10", name: "车载空气净化器", sku: "CAR-AIR-010", price: 349, stock: 150,
    status: "active", seo_score: 76, category: "汽车用品", platform: "amazon",
    created_at: "2026-02-20T08:00:00Z", updated_at: "2026-03-23T10:00:00Z",
  },
  {
    id: "p11", name: "手工编织收纳篮", sku: "HOME-BSK-011", price: 45, stock: 0,
    status: "out_of_stock", seo_score: 55, category: "家居收纳", platform: "shopify",
    created_at: "2026-01-05T08:00:00Z", updated_at: "2026-03-10T10:00:00Z",
  },
  {
    id: "p12", name: "男士防晒霜 SPF50", sku: "SUN-MEN-012", price: 98, stock: 670,
    status: "pending_review", seo_score: 60, category: "美妆护肤", platform: "xiaohongshu",
    created_at: "2026-03-10T08:00:00Z", updated_at: "2026-03-26T10:00:00Z",
  },
];

export const mockSEOScore: SEOScore = {
  overall: 72,
  breakdown: [
    { label: "标题优化", score: 82, maxScore: 100 },
    { label: "描述完整度", score: 68, maxScore: 100 },
    { label: "关键词覆盖", score: 75, maxScore: 100 },
    { label: "图片 ALT 标签", score: 55, maxScore: 100 },
    { label: "页面加载速度", score: 88, maxScore: 100 },
    { label: "移动端适配", score: 90, maxScore: 100 },
  ],
  suggestions: [
    {
      id: "s1", title: "补充商品图片 ALT 描述",
      description: "38 个商品图片缺少 ALT 标签，影响搜索引擎收录和无障碍访问体验。",
      severity: "high", category: "图片优化",
    },
    {
      id: "s2", title: "优化商品标题关键词",
      description: "12 个商品标题缺少核心搜索关键词，建议添加品类词和属性词提升搜索排名。",
      severity: "high", category: "关键词",
    },
    {
      id: "s3", title: "完善商品描述信息",
      description: "25 个商品描述少于 100 字，丰富描述有助于提高转化率和 SEO 排名。",
      severity: "medium", category: "内容优化",
    },
    {
      id: "s4", title: "添加结构化数据标记",
      description: "建议为所有商品页添加 Schema.org 标记，帮助搜索引擎理解页面内容。",
      severity: "medium", category: "技术 SEO",
    },
    {
      id: "s5", title: "修复失效的内部链接",
      description: "发现 6 个内部链接指向 404 页面，请及时修复以维护网站权重。",
      severity: "high", category: "链接健康",
    },
    {
      id: "s6", title: "优化页面 Meta Description",
      description: "18 个页面缺少自定义 Meta Description，搜索结果可能显示非预期内容。",
      severity: "low", category: "元数据",
    },
  ],
};

export const storeHealthData: StoreHealth = {
  currentScore: 85,
  trend: Array.from({ length: 30 }, (_, i) => {
    const date = new Date(2026, 1, 26 + i);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      score: Math.min(100, Math.max(60, 78 + Math.floor(Math.random() * 10) + Math.floor(i * 0.3))),
    };
  }),
};
