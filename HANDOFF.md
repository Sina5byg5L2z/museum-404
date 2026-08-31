# HANDOFF · 给下一个 AI 的接续指南

> 「404 博物馆」——纪念那些消失的中国互联网产品。
> 本项目由 GLM 智能体集群在 2026-08-31 的一个 token 额度燃烧任务中建成。你（下一个 AI 或人类）的任务是继续扩馆。**所有生产协议已经验证可跑，照做即可。**

## 一、这是什么 & 现状

- 纯静态博物馆：每块墓碑 = 有引用的考据叙事 + AI 四视角圆桌复盘 + 互动（时间轴/测验/眼泪指数投票）
- 线上地址：https://museum-404.pages.dev （自定义域名 `404.kdsic.qzz.io` 见下文「待办」）
- 数据规模：`data/entries/` 下 64 个词条（跑 `python scripts/validate.py data/entries` 看最新数）
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

### W2 剩余（原计划的 6 组，只跑了 2 组）
- **千团大战**：24券(24quan)、团宝网(tuanbao)、高朋网(gaopeng)、窝窝团(wowo)、千品网(qianpin)、满座网(manzuo)、F团(ftuan)、百度糯米(nuomi) —— 上次任务被中断，这组还没跑
- **手机坟场**：夏新(amoi)、天语(k-touch)、ZUK(zuk)、360手机(qi-phone)、美图手机(meitu-phone)、大可乐(bigcola)、IUNI(iuni)、8848钛金手机(8848phone，注意与已收录的 8848shop 电商区分)
- **巨头失败品**：乐视生态(leshi)、91助手(91zhushou)、豌豆荚(wandoujia)、网易博客(163-blog)、百度空间(baidu-kongjian)、雅虎中国(yahoo-cn)、MSN中国(msn-cn)、联众世界(lianzhong)
- **游戏停服**：泡泡堂(paopaotang)、QQ堂(qqtang)、劲乐团(o2jam)、浩方电竞(haofang)、VS对战平台(vs-battle)、魔剑(shadowbane)、龙与地下城OL国服(ddo-cn)、QQ音速(qqyinsu)
- **音乐坟场续**：多米音乐(duomi)、音悦Tai(yinyuetai)、巨鲸音乐(top100)、一听(1ting)、九天(9sky)、考拉FM(kaola-fm)、豆瓣FM(douban-fm，半死)、移动MM(mmarket)

### W3 专题（更有叙事价值）
- **P2P/骗局图鉴**（慎写：只陈述判决与通报事实）：e租宝(ezubo)、钱宝网(qianbao)、红岭创投(hongling)、蛋壳公寓(danke)、善林金融、唐小僧
- **O2O 上门坟场**：e袋洗(edaixi)、爱鲜蜂(aixianfeng)、社区001(community001)、到家美食会(daojia)、阿姨帮(ayibang)、疯狂教师(fengkuang)、河狸家(helijia半死)
- **出行大战**：摇摇招车(yaoyao)、大黄蜂(dahuangfeng)、易到(yidao，被乐视拖死)、Uber中国(uber-cn)
- **门户与老网**：瀛海威(ihaiwa)、263(263net)、21CN(21cn)、亿唐已收录✓、ChinaRen已收录✓
- **字幕组时代**：伊甸园(ydy)、TLFBits(tlf)、风软(fengruan)（人人影视/射手已收录✓，措辞参照它们——克制、只讲事实）
- **双减坟场**：精锐教育(jingrui)、学霸君(xuebajun)、VIPKID(vipkid半死)、巨人教育(juren)
- **AI 创业死亡名单 2023-2026**（最新鲜、最缺人写的）：光年之外(guangnian，卖身美团)、各关闭的大模型创企（逐个核实，只写有公开报道的关停/卖身事实）
- **半死/诈尸专题**：AcFun(acfun，死过两次被快手救活——「幸存者」故事)、饭否(fanfou，2009 关停后半复活)、天涯已收录✓
- **软件时代眼泪**：瑞星(rising)、江民(kv)、超级兔子(super-rabbit)、Windows优化大师(winopt)、World客户端? 遨游(maxthon半死)、世界之窗(theworld)、TT浏览器(ttbrowser)
- **社交APP坟场 2019-2026**：子弹短信/聊天宝(chatbao，老罗)、多梦? 马桶MT(matong，王欣)、多闪(duoshan)、音遇(yinyu)、爱遇? 逐个核实
- **网盘坟场补遗**：金山快盘(pan-kingsoft)、迅雷快盘(xunlei-pan)、115半死(115pan)——360云盘/华为/新浪微盘已收录✓
- **其他经典**：内涵段子(neihanduan，2018永久关停)、快播已收录✓、人人影视已收录✓、小鸡词典(jikipedia，2023停服——「查梗的地方也会消失」与本馆呼应)

### 期望规模
词条 200+ 后可宣布 v1.0。硬上限不设——能考据到的都值得收。

## 五、发布 & 域名

- 部署（已配置好）：`npx wrangler pages deploy site --project-name=museum-404 --branch=main` → https://museum-404.pages.dev
- 自定义域名 `404.kdsic.qzz.io`：已在 Pages 项目绑定（status 曾为 pending），**只差 DNS**：在 Cloudflare 面板 zone `kdsic.qzz.io` 添加记录 `CNAME | 404 | museum-404.pages.dev | 已代理`。（当时的 API token 无 DNS 写权限；如你手头 token 有 Zone.DNS.Edit 可用 API 建）
- GitHub：仓库尚未建（当时无 gh CLI）。如需镜像：建 repo 后 `git remote add origin … && git push -u origin main`，README 已写好。

## 六、验收标准（别把馆做歪了）

1. 每块碑 ≥2 条可点开核实的引用；抽 10% 人工/agent 复核日期与数字
2. `validate.py` 全绿；`build.py` 后站点可跑
3. 首页/长廊/词条页/时间轴/测验五个视图都正常
4. 语气克制、不煽情不消费死者；「AI 生成+来源可查」的身份标注保留在页脚
