# Promptfoo Golden Tests

防止 prompt 改版后质量回退。每次改完 prompt，跑一遍这个 eval，分数比上次低就别合。

## 安装

```bash
npm i -D promptfoo
```

## 环境变量

```bash
export API_URL=https://brandmind-ai-eight.vercel.app
export CRON_SECRET=<Vercel 里设置的那个>   # 用于调 /api/prompts
export OPENAI_API_KEY=sk-...               # LLM-rubric judge 用 GPT-4.1-mini
```

## 运行

```bash
# 全部 golden tests
npx promptfoo eval -c promptfoo/promptfoo.yaml

# 只测某个 slug（按 description 过滤）
npx promptfoo eval -c promptfoo/promptfoo.yaml --filter-description "SEO"

# Web UI（推荐）
npx promptfoo view
```

## 加新 golden test

改 `promptfoo.yaml`，加一个 `tests` 条目：

```yaml
- description: "... 描述 ..."
  vars:
    slug: your.prompt.slug
    # 其他变量直接按模板里 {{xxx}} 写
  assert:
    - type: javascript
      value: "output.your_field && output.your_field.length > 0"
    - type: llm-rubric
      value: "Check that ..."
```

## CI 集成（未来）

在 `.github/workflows/prompt-quality.yml` 加：

```yaml
- run: npx promptfoo eval -c promptfoo/promptfoo.yaml --output json > results.json
- run: node scripts/check-score-regression.js  # 比较上次结果，降 >5% 就 fail
```
