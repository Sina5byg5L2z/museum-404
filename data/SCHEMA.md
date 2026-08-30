# 墓碑词条数据规范（v1）

每个词条一个文件：`data/entries/<slug>.json`，UTF-8，无 BOM。`slug` 为产品英文/拼音短横线名（如 `xiami`、`tianya`）。

## 完整字段

```jsonc
{
  "id": "xiami",                    // 必填，=文件名，正则 ^[a-z0-9][a-z0-9-]{1,39}$
  "name": "虾米音乐",                // 必填
  "aliases": ["Xiami", "虾米"],      // 可选
  "category": "music",              // 必填枚举: community|social|media|music|video|game|
                                    //   ecommerce|o2o|finance|hardware|software|webdisk|
                                    //   education|tool|browser|other
  "era": "stream",                  // 必填枚举: portal(1994-2000)|bbs(2000-2005)|
                                    //   blog(2005-2009)|social(2009-2013)|mobile(2013-2017)|
                                    //   o2o(2015-2019)|stream(2018-2022)|agent(2023-2026)
  "born": "2008",                   // "YYYY" 或 "YYYY-MM"，不确定就填最可靠的并放宽（见 status）
  "died": "2021-02",                // 同上；多次挣扎的填最终实质性死亡时间
  "peak": "2012",                   // 可选，鼎盛年份
  "peak_users": "千万级注册用户",     // 可选，定性可，定量必须有引用
  "death_cause": "competition",     // 必填枚举: policy|competition|copyright|tech_shift|
                                    //   funding|fraud|founder|market|merge_absorb|other
  "cause_detail": "版权大战中曲库全面落后",  // 必填，≤40字
  "epitaph": "音乐的理想主义，死于版权的现实主义。", // 必填墓志铭 ≤30字
  "story": {                        // 必填，四节固定键名，每节 150~400 字
    "诞生": "……",
    "巅峰": "……",
    "转折": "……",
    "终局": "……"
  },
  "moments": ["名场面/经典梗", "……"],   // 2~5 条
  "legacy": ["它留下的东西", "……"],     // 1~4 条
  "quotes": [{"text": "去，与你的挚爱合过影。", "context": "官方告别文案"}], // 0~3
  "roundtable": [                   // 必填，恰好 4 个视角，persona 固定为这四个
    {"persona": "产品经理", "say": "≤200字复盘发言"},
    {"persona": "老用户",   "say": "……"},
    {"persona": "投资人",   "say": "……"},
    {"persona": "时代观察者", "say": "……"}
  ],
  "consensus": "圆桌共识一句话",      // 必填 ≤40字
  "tears_hint": 4,                  // 预设「时代眼泪指数」1~5
  "related": ["其他词条id"],          // 可选，指向还不存在的id只警告不报错
  "tags": ["音乐", "版权大战", "阿里系"], // 2~6 个
  "sources": [                      // 必填 ≥2 条；优先政府/央媒/法院/高校/门户科技媒体
    {"title": "虾米音乐2月5日关停", "url": "https://…", "site": "央视网", "date": "2021-01-05"}
  ],
  "status": "verified"              // verified | partially_verified（关键事实有存疑时用后者）
}
```

## 硬性规则

1. **不编造**：日期、数字、事件必须有来源支撑；拿不准 → `status: "partially_verified"` 并在 story 里用「据……报道」措辞。
2. **≥2 引用**：每条 `{title, url, site}`；date 可选。引用是给读者点开的，标题要能对应。
3. **安全红线**：涉政策、司法、诈骗案件只陈述有公开报道的事实，不做定性引申，不站队；不收录涉黄涉政站点；对在世创始人不做贬损性评价，仅叙述公开事实。
4. **半死不活的**（还剩个壳但实质死亡）可以收，`died` 填实质死亡时间，story 终局里说明现状。
5. **文风**：克制、有细节、不煽情堆砌；禁止「网上说」「据说」这类无主语消息源；每个重要判断落回引用。
6. **story 四节**总长 800~1500 字；圆桌每段 ≤200 字，必须围绕**本产品的事实**说话，不写放之四海皆准的空话。
