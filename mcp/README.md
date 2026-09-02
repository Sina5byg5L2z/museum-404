# 404 博物馆 · MCP Server

把馆藏 **207 个已消失的中国互联网产品** 词条开放给任意支持 MCP（Model Context Protocol）的 LLM 客户端。零依赖，只需 Python 3.8+。

## 提供的工具

| 工具 | 作用 |
|---|---|
| `search_entries` | 关键词检索馆藏（产品名/别名/标签/碑文，中文自动拆二元词），可按年代/类别/死因过滤 |
| `get_entry` | 按 id 取完整词条：四段考据叙事、名场面、AI 四视角圆桌复盘、遗产、新闻来源 |
| `list_entries` | 按卒年分页浏览全部馆藏，支持过滤 |
| `random_entry` | 随机抽一座碑 |
| `get_stats` | 馆藏概况：总数、年代/死因/类别分布、考据状态 |

数据源：优先 `site/data/db.json`（`python scripts/build.py` 的产物），缺失时自动回退扫描 `data/entries/*.json`。

## 接入方式

### ZCode（本项目根目录已放好 `.mcp.json`，打开即用）

```json
// .mcp.json
{ "mcpServers": { "museum-404": { "command": "python", "args": ["mcp/server.py"] } } }
```

或命令行：`zcode mcp add museum-404 -- python mcp/server.py`

### Claude Desktop

编辑 `claude_desktop_config.json`（macOS: `~/Library/Application Support/Claude/`，Windows: `%APPDATA%\Claude\`）：

```json
{
  "mcpServers": {
    "museum-404": {
      "command": "python",
      "args": ["D:\\code\\meaningful\\mcp\\server.py"]
    }
  }
}
```

### Cursor / 其它客户端

stdio 类型，命令 `python`，参数 `mcp/server.py`（绝对路径按本仓库实际位置填写）。

## 手动冒烟测试

```bash
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
 '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_stats","arguments":{}}}' \
 | python mcp/server.py
```

## 配套：网页版 AI 问答

站点上也有一套不依赖 MCP 的问答（浏览器直连 LLM，BYOK）：

- 页面导航 → 「AI 问答」→ 齿轮配置服务商（OpenAI 兼容接口：智谱/DeepSeek/Kimi/通义/OpenAI/OpenRouter 或自定义）→ 密钥只存浏览器 localStorage
- 提问时前端自动检索馆藏相关词条注入上下文，AI 依据考据作答并标注来源词条
- 无密钥想先试水：`python scripts/mock_llm.py` 起一个本地假 LLM（端口 8123），Base URL 填 `http://127.0.0.1:8123/v1`，模型随便填
