# BrandMind AI — 系统架构（2026-04-20）

一页纸搞清楚每个模块是干嘛的、什么时候用哪个。

---

## 核心心智模型

系统分 **4 层**，上层调用下层，下层不知道上层存在：

```
┌─ L4 编排层 / Orchestrator Playbooks ────────────────────┐
│  用户说一句话 → AI 选 playbook → 并行调度 L3           │
│  src/lib/orchestrator/                                 │
├─ L3 专家层 / Skills ────────────────────────────────────┤
│  单一职责的能力单元，50+ 个                             │
│  src/lib/content-skills/                                │
├─ L2 服务层 / Services ──────────────────────────────────┤
│  Shopify / Photoroom / Replicate / Shotstack / LLM      │
│  src/lib/shopify-operations.ts, image-processing.ts    │
├─ L1 数据层 / Supabase ──────────────────────────────────┤
│  products / orders / brand_guides / client_inferences   │
│  supabase/migrations/                                   │
└────────────────────────────────────────────────────────┘
```

## 每层 1 个入口，不要绕路

| 想做什么 | 用哪个 |
|---|---|
| 用户用自然语言下达业务目标 | **L4 Orchestrator** (`/api/orchestrator`) |
| 单独执行一个技能（比如只写个详情页） | **L3 Skill** (`/api/generate`) |
| 每周自动跑周计划 | **L4 ops_automation playbook**（迁移中，目前仍是 ops-director.ts） |
| 生成图片/视频 | **L2** image-service / image-processing |

---

## 页面结构 / 侧边栏（重构后）

**总览**：只看结果
- `/dashboard` — 业务数据
- `/monitor` — 工作流/任务运行状态
- `/health` — 系统自检

**运营中心**：做决策和执行
- `/client-profile` — **客户画像**（AI 推理 + 5 个微任务，一切决策的基础）
- `/workflows` — **工作流中心**（4 个 playbook + AI 指挥官）
- `/store` — 店铺优化操作台
- `/social` — 社媒规划
- `/approvals` — 审批中心

**内容**：素材和文案
- `/content` — 内容工厂（触发单个 skill）
- `/media-library` — 生成的素材
- `/campaigns/calendar` — 营销日历
- `/prompts` — Prompt 实验室（prompts DB 治理）
- `/costs` — AI 成本看板

**系统**
- `/brand-guide` — **品牌视觉**（仅颜色/字体/logo；深度画像看客户画像）
- `/settings` — 系统设置

**已隐藏（代码保留，职责已迁移）**：
- `/ops-cockpit` → 功能已被 `/workflows` 取代
- `/mission-control` → 运行历史已集成到 `/monitor`
- `/references` → 竞品系统重做中（模块 2 会用 competitor_products 表）
- `/campaigns/compose` → 已被工作流中心取代

---

## 编排层（L4）— 唯一的任务指挥官

**入口**：`src/lib/orchestrator/`

- `types.ts` — `Playbook` / `WorkflowStep` / `WorkflowContext`
- `workflow-engine.ts` — 执行引擎（顺序/并行/条件/审批/重试/持久化）
- `ai-planner.ts` — 自然语言 → 选 playbook
- `playbooks/` — 4 个开箱即用的剧本
- `registry.ts` — playbook 注册表

**4 个 Playbook**：
1. **`product_launch`** — 新品上市全套（9 步，PMF → 定价 → 详情页 → 图/视频/社媒并行 → 广告 brief → 承接页 → 审批）
2. **`clearance_campaign`** — 清仓活动（7 步，诊断 → 定价 → 活动 → 页面+邮件并行 → 推广）
3. **`store_optimization`** — 独立站优化（5 步，诊断 → 批量 SEO → 重写最差 → 首页升级）
4. **`weekly_content_pack`** — 一周内容包（9 步，选品 → 日历 → 3 视频脚本并行 → 帖子+标签 → 配图）

**不要再建新的顶层编排系统**。所有复合任务走 playbook。

### 与 ops-director / content-pipeline 的关系

- `src/lib/ops-director.ts` — 旧架构，负责每周自动运营。**逐步迁移为 playbook**（留作过渡期）
- `src/lib/content-pipeline.ts` — 旧架构，三个硬编码 pipeline。**被 playbook 取代**，现有调用暂不动

---

## 技能层（L3）— 单一职责原子能力

**入口**：`src/lib/content-skills/registry.ts`

### 命名冲突 & 职责区分

| Skill 组合 | 各自职责 |
|---|---|
| `product_detail_page` vs `shopify_detail_page` | 前者产出**结构化 JSON**（meta/卖点/标题），后者产出**完整 HTML body**（推 Shopify） |
| `landing_page` vs `campaign_page` | `landing_page` 是主推（CRO 结构完整），`campaign_page` 标记为旧版，新项目禁用 |
| `flash_sale_planner` vs `landing_page` | `flash_sale_planner` 做**整体活动策划**（四阶段/定价/FOMO），`landing_page` 只做**页面** |
| `ad_creative_brief` vs `ad_campaign_blueprint` | `ad_creative_brief` 结构更新（ABO→CBO/Kill阈值），是主推 |

### 核心 Skill 分类

- **image/** — 图片（AI 生成/背景移除/4K 增强/视频/海报/Banner）
- **page/** — 页面 HTML（详情页/承接页/Hero/活动页）
- **copy/** — 文案（邮件/广告/定价/产品/客服）
- **social/** — 社媒（帖子/脚本/标签/日历/UGC/直播）
- **oem/** — B2B OEM 流程
- **website/** — 旧版 website 分类（和 page/ 有历史重叠，逐步归并）

---

## 客户画像（L1+L4 贯穿）— 所有决策的基础

**两张表**：
- `brand_guides` — 视觉和语气（颜色/字体/logo/tone_of_voice）
- `client_inferences` — AI 推理信号（pending → 用户确认 → 写入 brand_guides）
- `onboarding_tasks` — 5 个 30 秒微任务

**推理引擎**：`src/lib/client-profile/inference-engine.ts`
- `inferFromProductImage` — 从产品图推视觉调性/价格带/人群
- `inferFromVoiceOrText` — 从语气推品牌调性/人群
- `inferFromShopifyData` — 从店铺数据推运营风格
- `inferFromCompetitorReference` — 从竞品名单反推定位

**完成度驱动的功能解锁**：
- 40% → 周计划生成
- 60% → 广告 Brief / 承接页
- 80% → 自动执行工作流
- 100% → 全自动模式

---

## 新增功能的规矩（避免再乱）

1. **新复合流程** → 加 `playbook`，不要写新的 pipeline/ops-director 代码
2. **新原子能力** → 加 `skill`，检查 registry 是否有重复
3. **新页面** → 必须加到 NAV_ITEMS，或明确注释「内部调试用，不上 nav」
4. **新 DB 表** → 加 RLS + 写 migration 文件 + 在本文档更新
5. **新 API key / 外部服务** → `image-processing.ts` 或 `shopify-operations.ts` 集中管理，不散

---

## 生态集成状态

| 服务 | 状态 | Env Key |
|---|---|---|
| Supabase | ✅ 已接 | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Shopify | ✅ 已接（商品/订单/客户/页面）| `integrations` 表存 |
| Anthropic / OpenRouter | ✅ 已接 | `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` |
| Gemini（图片生成）| ✅ 已接 | `GEMINI_API_KEY` |
| Photoroom（背景移除）| ✅ 已接 | `PHOTOROOM_API_KEY` |
| Replicate（图片增强）| ✅ 已接 | `REPLICATE_API_KEY` |
| Shotstack（视频）| ✅ 已接 | `SHOTSTACK_API_KEY` |
| Klaviyo（邮件自动触发）| ⏸ 代码就绪，用户选择跳过 | `KLAVIYO_API_KEY` |

---

_最后更新：2026-04-20 · 见 git log 获取变更_
