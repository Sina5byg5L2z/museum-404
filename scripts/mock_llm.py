# -*- coding: utf-8 -*-
"""本地假 LLM：给「404 博物馆」AI 问事处空手试水 / 端到端测试用。

python scripts/mock_llm.py          # 监听 127.0.0.1:8123
然后站点「接入配置」里：Base URL = http://127.0.0.1:8123/v1，模型随便填（如 mock-1），
API Key 留空。它会把检索到的馆藏词条数量和名字回在回答里，用来验证检索链路。
"""
import json
import time
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if not self.path.rstrip("/").endswith("/chat/completions"):
            self.send_response(404); self._cors(); self.end_headers(); return
        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except UnicodeDecodeError:
            body = {"messages": [], "stream": False}
        msgs = body.get("messages", [])
        sys_text = next((m.get("content", "") for m in msgs if m.get("role") == "system"), "")
        q = next((m.get("content", "") for m in reversed(msgs) if m.get("role") == "user"), "")
        names = [ln.split("】")[0].lstrip("【") for ln in sys_text.splitlines() if ln.startswith("【") and ln.count("】")]
        reply = (f"收到你的提问:「{q}」。\n\n"
                 f"本次从馆藏检索到 {len(names)} 座相关碑:{'、'.join(names) if names else '（无）'}。\n"
                 "这是一条 mock 流式回答,证明:配置→检索→注入上下文→流式渲染 整条链路是通的。\n"
                 "换成真的服务商密钥后,这里就是真讲解员在说话了。")
        stream = bool(body.get("stream"))
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream" if stream else "application/json")
        self._cors()
        self.end_headers()
        if stream:
            step = max(6, len(reply) // 10)
            for i in range(0, len(reply), step):
                chunk = {"id": "mock", "object": "chat.completion.chunk", "model": body.get("model", "mock"),
                         "choices": [{"index": 0, "delta": {"content": reply[i:i + step]}, "finish_reason": None}]}
                self.wfile.write(f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n".encode("utf-8"))
                self.wfile.flush()
                time.sleep(0.12)
            self.wfile.write(b"data: [DONE]\n\n"); self.wfile.flush()
        else:
            out = {"id": "mock", "model": body.get("model", "mock"),
                   "choices": [{"index": 0, "message": {"role": "assistant", "content": reply},
                                "finish_reason": "stop"}]}
            self.wfile.write(json.dumps(out, ensure_ascii=False).encode("utf-8"))

    def log_message(self, fmt, *args):  # 安静一点
        pass


if __name__ == "__main__":
    print("[mock-llm] http://127.0.0.1:8123/v1  (Ctrl+C 退出)")
    HTTPServer(("127.0.0.1", 8123), Handler).serve_forever()
