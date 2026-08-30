# -*- coding: utf-8 -*-
"""校验 data/entries/ 下所有墓碑词条。用法: python scripts/validate.py [dir]"""
import json, os, re, sys, urllib.parse

DIR = sys.argv[1] if len(sys.argv) > 1 else "data/entries"

CATEGORY = {"community","social","media","music","video","game","ecommerce","o2o",
            "finance","hardware","software","webdisk","education","tool","browser","other"}
ERA = {"portal","bbs","blog","social","mobile","o2o","stream","agent"}
CAUSE = {"policy","competition","copyright","tech_shift","funding","fraud","founder",
         "market","merge_absorb","other"}
PERSONAS = ["产品经理","老用户","投资人","时代观察者"]
DATE_RE = re.compile(r"^\d{4}(-\d{2})?$")
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,39}$")

def fail(path, msg, errs): errs.append(f"{path}: {msg}")

def check_entry(path, data, errs, warns):
    for k in ("id","name","category","era","born","died","death_cause","cause_detail",
              "epitaph","story","roundtable","consensus","tags","sources","status"):
        if k not in data: fail(path, f"缺字段 {k}", errs)
    if "id" in data and not ID_RE.match(data["id"]):
        fail(path, f"id 不合法: {data['id']}", errs)
    if data.get("id") != os.path.splitext(os.path.basename(path))[0]:
        fail(path, "id 与文件名不一致", errs)
    if data.get("category") not in CATEGORY: fail(path, f"category 非法: {data.get('category')}", errs)
    if data.get("era") not in ERA: fail(path, f"era 非法: {data.get('era')}", errs)
    if data.get("death_cause") not in CAUSE: fail(path, f"death_cause 非法: {data.get('death_cause')}", errs)
    if data.get("status") not in ("verified","partially_verified"):
        fail(path, "status 非法", errs)
    for k in ("born","died"):
        if k in data and not DATE_RE.match(str(data[k])): fail(path, f"{k} 日期格式错: {data[k]}", errs)
    if "tears_hint" in data and data["tears_hint"] not in (1,2,3,4,5):
        fail(path, "tears_hint 须为 1~5", errs)
    e = data.get("epitaph","")
    if e and len(e) > 30: warn(path, f"墓志铭超过30字({len(e)})", warns)
    story = data.get("story", {})
    if set(story.keys()) != {"诞生","巅峰","转折","终局"}:
        fail(path, "story 必须恰好是 诞生/巅峰/转折/终局 四键", errs)
    else:
        total = 0
        for k, v in story.items():
            if not isinstance(v, str) or len(v) < 60:
                fail(path, f"story.{k} 太短(<60字)", errs)
            total += len(v or "")
        if total < 500: warn(path, f"story 总长仅{total}字", warns)
    m = data.get("moments")
    if not isinstance(m, list) or not (2 <= len(m) <= 5): fail(path, "moments 需 2~5 条", errs)
    lg = data.get("legacy")
    if not isinstance(lg, list) or not (1 <= len(lg) <= 4): fail(path, "legacy 需 1~4 条", errs)
    rt = data.get("roundtable", [])
    if not isinstance(rt, list) or len(rt) != 4 or [r.get("persona") for r in rt] != PERSONAS:
        fail(path, "roundtable 须为 产品经理/老用户/投资人/时代观察者 四段", errs)
    else:
        for r in rt:
            if len(r.get("say","")) < 40: fail(path, f"roundtable[{r.get('persona')}] 发言太短", errs)
    srcs = data.get("sources", [])
    if not isinstance(srcs, list) or len(srcs) < 2:
        fail(path, "sources 至少 2 条", errs)
    for s in srcs:
        if not s.get("title") or not s.get("url") or not s.get("site"):
            fail(path, f"source 缺 title/url/site: {s}", errs)
            continue
        u = urllib.parse.urlparse(s["url"])
        if u.scheme not in ("http","https") or not u.netloc:
            fail(path, f"source url 非法: {s['url']}", errs)
    tags = data.get("tags", [])
    if not isinstance(tags, list) or not (2 <= len(tags) <= 6): fail(path, "tags 需 2~6 个", errs)
    if data.get("status") == "verified":
        for k in ("born","died"):
            v = str(data.get(k,""))
            if v.endswith(("-00","-01")) and k=="born":
                pass

def warn(path, msg, warns): warns.append(f"{path}: {msg}")

def main():
    errs, warns, entries = [], [], []
    files = sorted(f for f in os.listdir(DIR) if f.endswith(".json"))
    if not files:
        print(f"[x] {DIR} 下没有词条文件"); sys.exit(1)
    for f in files:
        path = os.path.join(DIR, f)
        try:
            data = json.load(open(path, encoding="utf-8"))
        except Exception as ex:
            fail(path, f"JSON 解析失败: {ex}", errs); continue
        entries.append(data)
        check_entry(path, data, errs, warns)
    ids = [e.get("id") for e in entries if e.get("id")]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup: errs.append(f"重复 id: {dup}")
    all_ids = set(ids)
    for e in entries:
        for r in e.get("related", []):
            if r not in all_ids:
                warns.append(f"{e.get('id')}: related 指向不存在的 {r} (允许, 建后续补)")
    cats = {}
    for e in entries: cats[e.get("category","?")] = cats.get(e.get("category","?"),0)+1
    print(f"[i] 词条 {len(entries)} 个 | 类别分布 {cats}")
    if warns:
        print(f"[!] 警告 {len(warns)} 条:")
        for w in warns[:30]: print("   ", w)
    if errs:
        print(f"[x] 错误 {len(errs)} 条:")
        for e in errs[:60]: print("   ", e)
        sys.exit(1)
    print("[ok] 全部词条通过校验")

if __name__ == "__main__":
    main()
