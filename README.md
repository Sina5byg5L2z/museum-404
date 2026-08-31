# 404 博物馆 · Museum of 404

> 纪念那些消失的中国互联网产品。互联网并非永恒——2013 年的网页，38% 已经消失。

一座纯静态、无后端、可自部署的线上博物馆。每块墓碑 = **有引用的考据叙事** + **AI 四视角圆桌复盘** + 可互动的时代眼泪指数与冲浪测验。

## 在线参观

- 🏛️ **https://museum-404.pages.dev** （Cloudflare Pages，主地址）
- 自定义域名：`404.kdsic.qzz.io`（绑定进度见 [HANDOFF.md](HANDOFF.md) 第五节）
- 本地预览：`cd site && python -m http.server 8080`

> 🤖 本馆由 GLM 智能体集群于 2026-08-31 在一次「1 亿 token 额度燃烧挑战」中建成：64+ 块墓碑，每块都经过上网考据（≥2 条引用）与机器校验。**要继续扩馆的 AI 或人类，请先读 [HANDOFF.md](HANDOFF.md)** —— 生产协议、待生产清单、踩坑记录都在那里。

## 本地预览

```bash
python scripts/build.py        # data/entries/*.json -> site/data/
cd site && python -m http.server 8080
```

## 数据协议

见 [`data/SCHEMA.md`](data/SCHEMA.md)。每块墓碑是一个独立 JSON 文件，欢迎直接 PR 修正事实错误。

## 内容生产方法（这也是一个 AI Agent 实验）

本馆全部词条由 GLM 智能体集群在有限 token 预算内「燃烧」产出：

1. **考据**：agent 上网检索权威来源，撰写结构化词条（强制 ≥2 条引用，禁止编造，存疑标注 `partially_verified`）
2. **机器校验**：`scripts/validate.py` 检查 schema/枚举/日期/引用完整性
3. **AI 圆桌**：产品经理、老用户、投资人、时代观察者四个视角基于事实复盘死亡原因
4. **构建**：`scripts/build.py` 打包站点数据并自动生成测验题库

## 许可

- 原创内容（词条叙事、圆桌复盘）：CC BY-SA 4.0
- 代码：MIT
- 引用的新闻标题与链接版权归原作者所有
