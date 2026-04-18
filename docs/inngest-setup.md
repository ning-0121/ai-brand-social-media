# Inngest 配置指南（5 分钟）

Inngest 已经在代码里集成好了（`src/inngest/`）。只需在平台上注册并配好 2 个环境变量就能激活 DAG。

## 1. 注册 Inngest 账号

访问 [app.inngest.com](https://app.inngest.com) → 用 GitHub 登录 → 创建 Workspace。

Hobby 档免费，每月 50k 步够你用到产品有流量。

## 2. 同步你的 App

在 Inngest 控制台：

1. 左侧 **Apps** → 点 **Sync new app**
2. 选 **Vercel**（或 HTTP Endpoint）
3. App URL 填：
   ```
   https://brandmind-ai-eight.vercel.app/api/inngest
   ```
4. 点 Sync。Inngest 会自动爬取你的 2 个 function：
   - `product-full-content`（商品完整内容 DAG）
   - `homepage-hero-update`（首页 Hero 更新）

## 3. 拿环境变量

在 Inngest 控制台：

- 左侧 **Manage** → **Event Keys** → 复制 **Production Key**
- 左侧 **Manage** → **Signing Key** → 复制

## 4. 配到 Vercel

[Vercel Environment Variables](https://vercel.com/alexs-projects-f97c1255/brandmind-ai/settings/environment-variables)：

| 变量名 | 值 |
|--------|-----|
| `INNGEST_EVENT_KEY` | 步骤 3 的 Event Key |
| `INNGEST_SIGNING_KEY` | 步骤 3 的 Signing Key |

Environments 全选（Production / Preview / Development）→ 保存 → 去 Deployments 最新一条点 Redeploy。

## 5. 验证

部署完毕后，任何 `new_product_content` 或 `homepage_update` 任务都会自动 dispatch 到 Inngest。

两种看效果的方式：

**方式 1 — Inngest 控制台**

回 app.inngest.com，左侧 **Runs** 会出现实时执行记录。点任一条可以看 DAG 图、每个 step 的耗时、失败重试历史。

**方式 2 — 驾驶舱日志**

agent-worker 现在会返回 `{ action: "dispatched_to_inngest", event: "..." }` 代替直接执行。AI 督察面板会统计这些作为 success。

## 6. 本地开发（可选）

本地想跑 Inngest DAG 的话：

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

会起一个本地 Dev Server（默认端口 8288）并连接到你的 Next.js。所有事件都在本地执行，不触达生产。

## 故障排查

**同步时 404**：Next.js 服务没启，或路由没导出。检查 `src/app/api/inngest/route.ts` 存在。

**step.run 超时**：单个 step 仍有 60s 上限（Vercel 函数限制）。把重活拆成多个 step，或用 `step.sleep` 让 Inngest 分多次调。

**事件不触发**：`INNGEST_EVENT_KEY` 没配或环境变量没生效。重新 Redeploy。

## 关闭 Inngest（临时回退）

想暂时走旧的串行 pipeline，只需删掉 `INNGEST_EVENT_KEY` 环境变量并 Redeploy。agent-worker 代码检测到没 key 会自动走老路。
