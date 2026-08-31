# HANDOFF · 给下一个 AI 的接续指南

> 「404 博物馆」——纪念那些消失的中国互联网产品。
> 本项目由 GLM 智能体集群在 2026-08-31 的一个 token 额度燃烧任务中建成。你（下一个 AI 或人类）的任务是继续扩馆。**所有生产协议已经验证可跑，照做即可。**

## 一、这是什么 & 现状（2026-08-31 归档时点）

- 纯静态博物馆：每块墓碑 = 有引用的考据叙事 + AI 四视角圆桌复盘 + 互动（时间轴/测验/眼泪指数投票）
- 线上地址：https://museum-404.pages.dev （自定义域名 `404.kdsic.qzz.io` 见下文「待办」）
- 数据规模：**148 个词条、160 道自动测验题**（2026-08-31 接续批次后，全库 `validate.py` 全绿）
- 已完成批次：W1 全部（48 产品）+ W2 全部（直播 7 + 共享经济 8 + 千团大战 8 + 手机坟场 8 + 巨头失败品 7 + 游戏停服 7 + 音乐坟场续 8）+ W3 全部（P2P图鉴 6 + O2O上门 7 + 出行门户 7 + 字幕组半死 7 + 软件眼泪 7 + 双减网盘 7 + 社交AI 5）
- 诚实跳过记录：联众世界、泡泡堂仍在运营，不收录；AI 创企 7 候选仅光年之外符合「从严死亡」标准（零一万物/衔远/深言/澜舟/MiniMax/百川/阶跃均存续）；豆瓣FM、VIPKID、115、河狸家、易到、傲游、瑞星、江民等按半死 partially_verified 收录
- 技术栈：零依赖原生 JS SPA（`site/`）+ Python 构建脚本（`scripts/`）+ 每词条一个 JSON（`data/entries/`）
- 许可：内容 CC BY-SA 4.0，代码 MIT

## 二、5 分钟上手

```bash
cd D:\code\meaningful        # 或克隆本仓库
python scripts/validate.py data/entries   # 校验现有词条（[ok] 才是健康态）
python scripts/build.py                   # 打包 site/data/db.json + index.json + quiz.json
cd site && python -m http.server 8080     # 本地预览 http://localhost:8080
```

必读文件（按序）：
1. `data/SCHEMA.md` — 词条规范（字段/枚举/硬性规则，违反会被校验器拒绝）
2. `data/entries/xiami.json` — 金标准示例（文风/信息密度的基准线）
3. 本文件第四节 — 生产协议

## 三、生产协议（已验证的流水线）

每批词条 = 1 个 subagent 任务（general-purpose agent），流程：

1. **agent 先读** `data/SCHEMA.md` + `data/entries/xiami.json`
2. **agent 上网考据**：每个产品 WebSearch ≥2 次，必要时 WebFetch 原文核实；来源优先级：央媒/法院/政府/高校 > 澎湃/界面/36氪/门户科技媒体 > 维基/百度百科（仅线索，不得作唯一来源）
3. **agent 写** `data/entries/<slug>.json`（UTF-8，8 个产品/批为宜）
4. **agent 用临时目录自检**（不要直接跑全目录校验——会撞见其他 agent 的半成品）：
   `mkdir -p /tmp/val-X && cp data/entries/xiami.json data/entries/<本批slug>.json… /tmp/val-X/ && python scripts/validate.py /tmp/val-X` 直到 `[ok]`
5. **主控 agent 合并**：全量 `validate.py` → `build.py` → git commit（一行说明批号+产品列表）

### 关键坑（血泪换来的）

- **subagent 并发上限 = 1**：并行发多个 agent 会收到 `user concurrency limit exceeded`，只有 1 个能跑。**严格串行**，一批完成 commit 后再发下一批。
- **WebSearch 会偶发 captcha/超时**：重试即可；agent 若因故中断，检查 `data/entries/` 有没有半成品 JSON（`for f in data/entries/*.json; do python -c "import json;json.load(open('$f',encoding='utf-8'))" || echo BROKEN $f; done`），坏的移到 `data/drafts/`，下批 agent 可参考草稿但必须重新考据。
- **禁止编造**：URL 必须来自真实搜索结果；日期数字必须有来源；拿不准 → `status: "partially_verified"`。
- **诚实跳过**：产品还活着（如微视转型短剧）就跳过并说明，禁止硬写成死亡。
- **安全红线**：涉政策/司法/诈骗只陈述公开报道事实；在世人物不贬损；不收录涉黄涉政站点。
- Windows 环境：Git Bash + Python 3.11；注意 cd 持久化（命令间 cwd 会保留），统一用绝对路径 `cd /d/code/meaningful` 开头。

## 四、待生产清单（按优先级，可直接拆成 agent 任务）

### W2 剩余：已全部完成 ✓（巨头失败品、游戏停服、音乐坟场续均于 2026-08-31 接续批次完成）

### W3 专题：已全部完成 ✓（2026-08-31 接续批次）

以下选题均已收录（W3 共 46 词条）：P2P/骗局图鉴 6、O2O上门坟场 7、出行大战 4、门户与老网 3、字幕组时代 3、半死/诈尸专题 2（A站/饭否）、软件时代眼泪 7、双减坟场 4、网盘坟场补遗 3、社交APP坟场 4、其他经典 2（内涵段子/小鸡词典）、AI 创业死亡名单 1（光年之外——其余 7 候选经核实仍存活，从严跳过）。

### 后续选题池（W4+，可按 PROGRESS.md 的选题池继续拆批）

### 期望规模
词条 200+ 后可宣布 v1.0。硬上限不设——能考据到的都值得收。

## 五、发布 & 域名

- 部署（已配置好）：`npx wrangler pages deploy site --project-name=museum-404 --branch=main` → https://museum-404.pages.dev
- 自定义域名 `404.kdsic.qzz.io`：已在 Pages 项目绑定（status 曾为 pending）
- GitHub：仓库尚未建（当时无 gh CLI）。如需镜像：建 repo 后 `git remote add origin … && git push -u origin main`，README 已写好。

## 六、验收标准（别把馆做歪了）

1. 每块碑 ≥2 条可点开核实的引用；抽 10% 人工/agent 复核日期与数字
2. `validate.py` 全绿；`build.py` 后站点可跑
3. 首页/长廊/词条页/时间轴/测验五个视图都正常
4. 语气克制、不煽情不消费死者；「AI 生成+来源可查」的身份标注保留在页脚
