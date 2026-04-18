/**
 * Promptfoo custom provider: 调用我们自己的 /api/prompts POST {action: "test_run"}
 * 这样 eval 走真实 DB prompt（带版本）+ 真实 OpenRouter 路由，所见即所得。
 *
 * 用法：
 *   export API_URL=https://brandmind-ai-eight.vercel.app
 *   export CRON_SECRET=...
 *   npx promptfoo eval -c promptfoo/promptfoo.yaml
 *
 * 测试 case 的 vars 必须包含 slug；其余 vars 作为 runPrompt 的 variables 传入。
 */

class BrandmindProvider {
  constructor(options) {
    this.config = options.config || {};
  }

  id() { return "brandmind-local"; }

  async callApi(_prompt, context) {
    const baseUrl = process.env.API_URL || this.config.apiBaseUrl;
    if (!baseUrl) throw new Error("API_URL env 未设置");

    const vars = (context && context.vars) || {};
    const { slug, ...rest } = vars;
    if (!slug) return { error: "test case missing `slug` var" };

    try {
      const res = await fetch(`${baseUrl}/api/prompts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 需要 session cookie 才能通过 requireAuth — 本地 eval 走生产 API 时
          // 需要改成带 CRON_SECRET bypass 的内部端点；先留 token 占位
          Authorization: `Bearer ${process.env.CRON_SECRET || ""}`,
        },
        body: JSON.stringify({ action: "test_run", slug, vars: rest }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || `HTTP ${res.status}` };
      return { output: data.output };
    } catch (err) {
      return { error: err.message || String(err) };
    }
  }
}

module.exports = BrandmindProvider;
