# HANDOFF · 给下一个 AI 的接续指南

> 「404 博物馆」——纪念那些消失的中国互联网产品。
> 本项目由 GLM 智能体集群在 2026-08-31 的一个 token 额度燃烧任务中建成。你（下一个 AI 或人类）的任务是继续扩馆。**所有生产协议已经验证可跑，照做即可。**

## 一、这是什么 & 现状（2026-08-31 归档时点）

- 纯静态博物馆：每块墓碑 = 有引用的考据叙事 + AI 四视角圆桌复盘 + 互动（时间轴/测验/眼泪指数投票）
- 线上地址：https://museum-404.pages.dev （自定义域名 `404.kdsic.qzz.io` 见下文「待办」）
- 数据规模：**207 个词条、219 道自动测验题**（2026-08-31 W5 接续批次后，全库 `validate.py` 全绿）——**v1.0（200+）已达成**
- 已完成批次：W1 全部 + W2 全部（31 词条）+ W3 全部（46 词条）+ W4（文学旅游 6 + 长租游戏VR 5）+ W5 六批 48 词条（视频直播电竞/电商生鲜/教培续/搜索软件/社交博客/社区团购新零售）
- 诚实跳过记录：联众世界、泡泡堂仍在运营，不收录；AI 创企 7 候选仅光年之外符合「从严死亡」标准（零一万物/衔远/深言/澜舟/MiniMax/百川/阶跃均存续）；豆瓣FM、VIPKID、115、河狸家、易到、傲游、瑞星、江民、PPTV、搜狗、阿卡索、51Talk、兴盛优选、连咖啡、超级课程表、Faceu 等按半死 partially_verified 收录
- W5 考据勘误（agent 据实修正任务书）：易果生鲜破产受理为 2020-10（非2023）；呆萝卜投资方无腾讯（高瓴/XVC/五源）；PPTV 2013 投资方为苏宁+弘毅（非联想）；兴盛优选无阿里投资（腾讯/红杉/京东/KKR）；十荟团「陈一舟投资」查无实据已剔除
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

- **WebSearch 会偶发 captcha/超时**：重试即可；agent 若因故中断，检查 `data/entries/` 有没有半成品 JSON（`for f in data/entries/*.json; do python -c "import json;json.load(open('$f',encoding='utf-8'))" || echo BROKEN $f; done`），坏的移到 `data/drafts/`，下批 agent 可参考草稿但必须重新考据。
- **禁止编造**：URL 必须来自真实搜索结果；日期数字必须有来源；拿不准 → `status: "partially_verified"`。
- **诚实跳过**：产品还活着（如微视转型短剧）就跳过并说明，禁止硬写成死亡。
- **安全红线**：涉政策/司法/诈骗只陈述公开报道事实；在世人物不贬损；不收录涉黄涉政站点。
- Windows 环境：Python 3.11；注意 cd 持久化（命令间 cwd 会保留），统一用绝对路径 `cd D:\code\meaningful` 开头。**本机 shell 是 PowerShell 5：命令分隔用 `;` 不能用 `&&`**；多文件 `Copy-Item a b c $d\` 在某些包装器下报参数绑定错误，让 agent 改用逐个复制或 `Copy-Item *.json $d\`。自检目录用 `$env:TEMP\val-X`。

## 四、待生产清单（按优先级，可直接拆成 agent 任务）

### W2 剩余：已全部完成 ✓（巨头失败品、游戏停服、音乐坟场续均于 2026-08-31 接续批次完成）

### W3 专题：已全部完成 ✓（2026-08-31 接续批次）

以下选题均已收录（W3 共 46 词条）：P2P/骗局图鉴 6、O2O上门坟场 7、出行大战 4、门户与老网 3、字幕组时代 3、半死/诈尸专题 2（A站/饭否）、软件时代眼泪 7、双减坟场 4、网盘坟场补遗 3、社交APP坟场 4、其他经典 2（内涵段子/小鸡词典）、AI 创业死亡名单 1（光年之外——其余 7 候选经核实仍存活，从严跳过）。

### 后续选题池（W6+，可继续拆批）

v1.0 已达成（207），扩馆不封顶。已验证好写、来源充分的候选方向：

- **快递坟场**：天天快递（苏宁收购后停运）、全峰快递、国通快递、如风达、快捷快递、百世快递（被极兔收购）、速递易
- **造车新势力死亡名单**（2021-2026，科技/智能汽车范畴）：威马、拜腾、高合、极越、爱驰、博郡、赛麟、奇点、长江汽车
- **游戏停服潮**：第九城市（失魔兽代理）、使命召唤OL、指环王OL国服、激战国服、泡泡战士、节奏大师
- **长租爆雷余波**：寓见公寓、鼎家（蛋壳/青客已收）
- **出行余波**：小鸣单车、町町单车、享骑电单车、百度外卖、e代驾
- **智能硬件**：叮咚音箱（2020停服）、斐讯（联璧0元购）、天猫精灵（半死）、bong 手环
- **无人/共享余波**：猩便利、邻几？、女神派（共享租衣）
- **LBS/签到坟场**：切客、嘀咕、玩转四方（街旁已收）
- **餐饮新消费**：黄太吉、雕爷牛腩、邻家便利店、全时便利店
- **轻博客/博客余波**：博客大巴、宽岛、搜狐博客（blogcn/点点/推他已收）

### 期望规模
**v1.0 已达成（207 词条）。** 硬上限不设——能考据到的都值得收。

## 五、发布 & 域名

- 部署（已配置好）：`npx wrangler pages deploy site --project-name=museum-404 --branch=main` → https://museum-404.pages.dev
- 自定义域名 `404.kdsic.qzz.io`：已绑定并生效（2026-08-31 验证 HTTPS 200）
- GitHub 镜像：https://github.com/Sina5byg5L2z/museum-404 （remote `origin` 已配置，本地分支 `main` 跟踪 `origin/main`；推送：`git push origin main`）。注意：Pages 部署仍是直传 `wrangler pages deploy site`，未接 GitHub 自动构建。

## 六、验收标准（别把馆做歪了）

1. 每块碑 ≥2 条可点开核实的引用；抽 10% 人工/agent 复核日期与数字
2. `validate.py` 全绿；`build.py` 后站点可跑
3. 首页/长廊/词条页/时间轴/测验五个视图都正常
4. 语气克制、不煽情不消费死者；「AI 生成+来源可查」的身份标注保留在页脚

## 七、AI 接入层（2026-09-03 新增，两条路互不依赖）

### 1. MCP Server（给 LLM 客户端的数据接口）
- `mcp/server.py`：零依赖 Python stdio MCP（JSON-RPC 2.0，逐行消息），已冒烟验证握手/工具/中文
- 5 个工具：`search_entries`（中文自动拆二元词）/ `get_entry`（含四段叙事+圆桌+来源）/ `list_entries`（过滤+分页）/ `random_entry` / `get_stats`
- 数据源优先 `site/data/db.json`，缺了自动回退 `data/entries/*.json`
- 接入：项目根 `.mcp.json` 已配好（ZCode 开箱即用）；Claude Desktop / Cursor 配置见 `mcp/README.md`

### 2. 网页 AI 问事处（BYOK 浏览器直连，站点导航「AI 问答」）
- `site/js/ai.js`（约 300 行）：配置面板（服务商预设：智谱/DeepSeek/Kimi/通义/OpenAI/OpenRouter/自定义，OpenAI 兼容接口）+ 问答区
- 密钥/配置存 localStorage（`m404-ai-cfg`），对话存 `m404-ai-chat`，请求浏览器直发服务商，**不经任何服务器**（纯静态站没有后端）
- 提问时前端在 index.json 检索 top6 相关词条（名称/别名/标签/碑文加权），把考据全文注入 system 上下文；回答后挂「依据馆藏」词条链接 chips
- 流式 SSE 解析 + 非 stream 回退 + AbortController 停止 + IME Enter 防误发
- 词条页 AI 圆桌下有「就此碑询问 AI 讲解员」按钮，经 sessionStorage `m404-ai-prefill` 自动带入提问
- 空手试水：`python scripts/mock_llm.py`（假 LLM，端口 8123），Base URL 填 `http://127.0.0.1:8123/v1`
- 已浏览器端到端验证：配置保存→测试连接→检索注入→流式渲染→引用 chips→词条页追问入口
- 部署注意：Pages 是纯静态，AI 问事处随 `wrangler pages deploy site` 直接上线；CORS 由各服务商决定，报跨域时换服务商或自建代理

### 关键坑
- **跨脚本全局**：ESM 之外的 `const X=...` 不会挂 `window`，app.js 路由钩子必须用 `window.M404AI`，所以 ai.js 用 `window.M404AI = (...)()` 赋值式声明
