# -*- coding: utf-8 -*-
"""构建站点数据。用法: python scripts/build.py
读 data/entries/*.json → 产出 site/data/db.json（全量）、site/data/quiz.json（自动生成测验题）
"""
import json, os, random, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "data", "entries")
OUT = os.path.join(ROOT, "site", "data")
random.seed(404)

def main():
    entries = []
    for f in sorted(os.listdir(ENT)):
        if f.endswith(".json"):
            entries.append(json.load(open(os.path.join(ENT, f), encoding="utf-8")))
    entries.sort(key=lambda e: (str(e.get("died")), e.get("id","")))
    os.makedirs(OUT, exist_ok=True)
    json.dump({"entries": entries}, open(os.path.join(OUT,"db.json"),"w",encoding="utf-8"),
              ensure_ascii=False, separators=(",",":"))
    # 轻索引（首页/列表用不到 story，减小首屏体积）
    light = [{k: e.get(k) for k in ("id","name","aliases","category","era","born","died",
              "death_cause","cause_detail","epitaph","tears_hint","tags","status")}
             for e in entries]
    json.dump({"entries": light}, open(os.path.join(OUT,"index.json"),"w",encoding="utf-8"),
              ensure_ascii=False, separators=(",",":"))
    # ---------- 自动生成测验题 ----------
    quiz = []
    with_died = [e for e in entries if e.get("died")]
    for e in with_died:
        q = {"id": f"q-died-{e['id']}", "type": "year",
             "q": f"「{e['name']}」是哪一年实质性关停/退场的？", "a": str(e["died"])[:4],
             "entry": e["id"]}
        years = set()
        for d in with_died:
            y = str(d["died"])[:4]
            if y != q["a"]: years.add(y)
        if len(years) >= 3:
            q["wrong"] = random.sample(sorted(years), 3)
            quiz.append(q)
    alive = [e for e in entries]
    random.shuffle(alive)
    for i in range(0, min(len(alive)-4, 60), 5):
        grp, wrong_pool = alive[i:i+4], [e for e in entries]
        if len(grp) == 4:
            quiz.append({"id": f"q-which-{i}", "type": "which",
                         "q": "下列哪一个中文互联网产品已经停止服务/实质性消失？",
                         "a": random.choice(grp)["name"],
                         "wrong": [e["name"] for e in alive if e["id"] not in {g["id"] for g in grp}][:3],
                         "entry": grp[0]["id"]})
    json.dump({"quiz": quiz}, open(os.path.join(OUT,"quiz.json"),"w",encoding="utf-8"),
              ensure_ascii=False, separators=(",",":"))
    print(f"[ok] entries={len(entries)} quiz={len(quiz)} -> site/data/")

if __name__ == "__main__":
    main()
