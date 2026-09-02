# -*- coding: utf-8 -*-
"""404 博物馆 · MCP Server（stdio, 零依赖）

把馆藏 207 座碑的数据开放给任意支持 MCP 的 LLM 客户端
（ZCode / Claude Desktop / Cursor 等）。协议：JSON-RPC 2.0，一行一条消息。

启动：python mcp/server.py
数据：优先读 site/data/db.json（build.py 产物）；不存在则回退扫描 data/entries/*.json
"""
import json
import os
import random
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ERA = {
    "portal": "拨号上网·门户时代(1994-2000)", "bbs": "BBS·论坛黄金年代(2000-2005)",
    "blog": "博客·个人媒体觉醒(2005-2009)", "social": "社交网络·微博大战(2009-2013)",
    "mobile": "移动互联网·O2O前夜(2013-2017)", "o2o": "O2O·补贴大战坟场(2015-2019)",
    "stream": "流媒体·算法时代(2018-2022)", "agent": "AI时代·智能体浪潮(2023-2026)",
}
CAUSE = {
    "policy": "政策监管", "competition": "竞争失利", "copyright": "版权大战", "tech_shift": "技术革命",
    "funding": "资金断裂", "fraud": "骗局崩塌", "founder": "创始人", "market": "市场萎缩",
    "merge_absorb": "被并购吸收", "other": "其他",
}
CATEGORY = {
    "community": "社区", "social": "社交", "media": "媒体", "music": "音乐", "video": "视频",
    "game": "游戏", "ecommerce": "电商", "o2o": "O2O", "finance": "金融", "hardware": "硬件",
    "software": "软件", "webdisk": "网盘", "education": "教育", "tool": "工具",
    "browser": "浏览器", "other": "其他",
}

_LIGHT_KEYS = ("id", "name", "aliases", "category", "era", "born", "died", "death_cause",
               "cause_detail", "epitaph", "tears_hint", "tags", "status")
_cache = None


def load_entries():
    global _cache
    if _cache is not None:
        return _cache
    db_path = os.path.join(ROOT, "site", "data", "db.json")
    entries = None
    if os.path.exists(db_path):
        try:
            entries = json.load(open(db_path, encoding="utf-8")).get("entries")
        except Exception:
            entries = None
    if not entries:
        ent_dir = os.path.join(ROOT, "data", "entries")
        entries = []
        if os.path.isdir(ent_dir):
            for f in sorted(os.listdir(ent_dir)):
                if f.endswith(".json"):
                    try:
                        entries.append(json.load(open(os.path.join(ent_dir, f), encoding="utf-8")))
                    except Exception:
                        pass
    entries = [e for e in entries if isinstance(e, dict) and e.get("id")]
    entries.sort(key=lambda e: (str(e.get("died")), str(e.get("id"))))
    _cache = entries
    return entries


def light(e):
    return {k: e.get(k) for k in _LIGHT_KEYS}


def humanize(e):
    out = dict(e)
    out["death_cause"] = f"{CAUSE.get(e.get('death_cause'), e.get('death_cause'))}({e.get('death_cause')})"
    if e.get("era") in ERA:
        out["era"] = f"{ERA[e['era']]}({e['era']})"
    if e.get("category") in CATEGORY:
        out["category"] = f"{CATEGORY[e['category']]}({e['category']})"
    return out


def apply_filters(entries, a):
    era, cat, cause = a.get("era"), a.get("category"), a.get("death_cause")
    if era:
        entries = [e for e in entries if e.get("era") == era]
    if cat:
        entries = [e for e in entries if e.get("category") == cat]
    if cause:
        entries = [e for e in entries if e.get("death_cause") == cause]
    return entries


def search_score(e, term):
    term = term.lower()
    names = " ".join([str(e.get("name", ""))] + [str(a) for a in e.get("aliases", []) or []]).lower()
    tags = " ".join(str(t) for t in e.get("tags", []) or []).lower()
    body = (str(e.get("epitaph", "")) + " " + str(e.get("cause_detail", ""))).lower()
    s = 0
    if term in names:
        s += 3
    if term in tags:
        s += 2
    if term in body:
        s += 1
    return s


# ---------- tools ----------
def tool_search(a):
    q = str(a.get("query", "")).strip()
    if not q:
        return {"error": "query 不能为空"}
    entries = apply_filters(load_entries(), a)
    terms = q.split()
    if len(terms) == 1 and len(terms[0]) > 2 and not terms[0].isascii():
        seg = terms[0]
        terms = [seg] + [seg[i:i + 2] for i in range(len(seg) - 1)]
    scored = []
    for e in entries:
        s = sum(search_score(e, t) for t in terms)
        if s > 0:
            scored.append((s, e))
    scored.sort(key=lambda p: -p[0])
    limit = max(1, min(int(a.get("limit", 8)), 30))
    hits = [humanize(light(e)) for _, e in scored[:limit]]
    return {"query": q, "hits": len(hits), "total_matches": len(scored), "entries": hits}


def tool_get(a):
    eid = str(a.get("id", "")).strip()
    for e in load_entries():
        if e.get("id") == eid:
            return humanize(e)
    return {"error": f"未找到 id 为 {eid} 的词条。先用 search_entries 或 list_entries 查 id。"}


def tool_list(a):
    entries = apply_filters(load_entries(), a)
    total = len(entries)
    offset = max(0, int(a.get("offset", 0)))
    limit = max(1, min(int(a.get("limit", 50)), 200))
    page = entries[offset:offset + limit]
    return {"total": total, "offset": offset, "returned": len(page), "entries": [humanize(light(e)) for e in page]}


def tool_random(a):
    return humanize(random.choice(load_entries()))


def tool_stats(a):
    entries = load_entries()
    def cnt(key):
        d = {}
        for e in entries:
            d[e.get(key)] = d.get(e.get(key), 0) + 1
        return {f"{k}({ {**CAUSE, **CATEGORY, **ERA}.get(k, '?') })": v for k, v in d.items()}
    years = sorted(str(e.get("died"))[:4] for e in entries if e.get("died"))
    return {
        "museum": "404 博物馆 —— 纪念消失的中国互联网产品",
        "total_entries": len(entries),
        "died_year_range": [years[0], years[-1]] if years else None,
        "by_era": cnt("era"), "by_death_cause": cnt("death_cause"), "by_category": cnt("category"),
        "verified": sum(1 for e in entries if e.get("status") == "verified"),
        "partially_verified": sum(1 for e in entries if e.get("status") == "partially_verified"),
        "note": "每个词条含: 生卒年/死因/碑文/四段考据叙事/名场面/AI四视角圆桌复盘/遗产/新闻来源",
    }


TOOLS = [
    {
        "name": "search_entries",
        "description": "在 404 博物馆馆藏（207 个已消失的中国互联网产品词条）中做关键词检索。支持产品名/别名/标签/碑文匹配，中文自动拆二元词。返回轻量词条（生卒年、死因、碑文、标签），要全文用 get_entry。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "关键词，如：虾米 / 音乐 / 共享单车 / BBS"},
                "limit": {"type": "integer", "description": "返回条数上限，默认 8，最大 30"},
                "era": {"type": "string", "description": "按年代过滤: portal/bbs/blog/social/mobile/o2o/stream/agent"},
                "category": {"type": "string", "description": "按类别过滤: music/game/ecommerce/o2o/community/software 等"},
                "death_cause": {"type": "string", "description": "按死因过滤: policy/competition/copyright/tech_shift/funding/fraud/founder/market/merge_absorb/other"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_entry",
        "description": "按 id 取一个词条的完整内容：四段考据叙事（诞生/巅峰/转折/终局）、名场面、AI 四视角圆桌复盘、遗产、新闻来源引用。",
        "inputSchema": {
            "type": "object",
            "properties": {"id": {"type": "string", "description": "词条 id，如 xiami、kuaibo"}},
            "required": ["id"],
        },
    },
    {
        "name": "list_entries",
        "description": "分页浏览全部馆藏（按卒年排序），可按年代/类别/死因过滤。返回轻量词条。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "era": {"type": "string"}, "category": {"type": "string"}, "death_cause": {"type": "string"},
                "limit": {"type": "integer", "description": "默认 50，最大 200"},
                "offset": {"type": "integer", "description": "默认 0"},
            },
        },
    },
    {
        "name": "random_entry",
        "description": "随机抽一座碑（完整内容），适合无目标漫游式了解馆藏。",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_stats",
        "description": "馆藏概况：词条总数、年代/死因/类别分布、考据状态统计。",
        "inputSchema": {"type": "object", "properties": {}},
    },
]

TOOL_FUNCS = {"search_entries": tool_search, "get_entry": tool_get,
              "list_entries": tool_list, "random_entry": tool_random, "get_stats": tool_stats}

SERVER_INFO = {"name": "museum-404", "version": "1.0.0"}
PROTOCOL_VERSION = "2024-11-05"


def dispatch(msg):
    method = msg.get("method", "")
    params = msg.get("params") or {}
    if method == "initialize":
        return {"protocolVersion": params.get("protocolVersion") or PROTOCOL_VERSION,
                "capabilities": {"tools": {}}, "serverInfo": SERVER_INFO}
    if method == "ping":
        return {}
    if method == "tools/list":
        return {"tools": TOOLS}
    if method == "tools/call":
        name = params.get("name")
        args = params.get("arguments") or {}
        fn = TOOL_FUNCS.get(name)
        if not fn:
            return {"content": [{"type": "text", "text": f"未知工具: {name}"}], "isError": True}
        try:
            result = fn(args)
        except Exception as ex:  # noqa: BLE001 — 错误必须回给客户端而不是砸掉进程
            return {"content": [{"type": "text", "text": f"工具执行出错: {ex}"}], "isError": True}
        err = isinstance(result, dict) and result.get("error")
        return {"content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False, indent=1)}],
                "isError": bool(err)}
    return None


def main():
    # Windows 控制台默认 GBK，强制 UTF-8 才能传中文
    sys.stdout.reconfigure(encoding="utf-8") if hasattr(sys.stdout, "reconfigure") else None
    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue
        try:
            msg = json.loads(raw)
        except Exception:
            continue
        resp = dispatch(msg) if "id" in msg else None  # notification 无需应答
        if resp is not None:
            resp = {"jsonrpc": "2.0", "id": msg.get("id"), "result": resp}
            sys.stdout.write(json.dumps(resp, ensure_ascii=False, separators=(",", ":")) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
