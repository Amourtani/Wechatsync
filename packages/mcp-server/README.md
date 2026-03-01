# WechatSync MCP Server

MCP Server for WechatSync - 连接 Claude Code 和 Chrome Extension，实现 AI 辅助文章同步。

## 架构

### 本地模式（推荐）

```
┌─────────────┐      stdio       ┌─────────────────┐     WebSocket     ┌─────────────┐
│ Claude Code │ <──────────────> │ MCP Server      │ <───────────────> │  Extension  │
│   (本地)    │                  │    (本地)       │                   │  (Chrome)   │
└─────────────┘                  └─────────────────┘                   └─────────────┘
```

### 远程模式（需要桥接）

当 MCP Server 部署在远程服务器时，需要使用 `mcp-relay` 桥接服务：

```
┌─────────────┐                   ┌─────────────────┐                   ┌─────────────────┐     WebSocket     ┌─────────────┐
│ Claude Code │ <───────────────> │ MCP Server      │ <───────────────> │   mcp-relay     │ <───────────────> │  Extension  │
│   (本地)    │    SSE/stdio      │  (远程服务器)   │    WebSocket      │    (本地)       │   localhost:9527  │  (Chrome)   │
└─────────────┘                   └─────────────────┘                   └─────────────────┘                   └─────────────┘
```

**为什么需要桥接？**

Chrome 扩展（从商店安装）默认连接 `ws://localhost:9527`，无法直接连接远程服务器。`mcp-relay` 在本地监听 9527 端口，将消息转发到远程 MCP Server。

## 快速开始

### 1. 安装并构建

```bash
# 在项目根目录
pnpm install
pnpm build
```

### 2. 配置 Chrome 扩展

1. 点击扩展图标，进入设置
2. 启用「MCP 连接」开关
3. 设置一个安全 Token（记住这个值）

### 3. 配置 Claude Code

在 `~/.claude/claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "sync-assistant": {
      "command": "node",
      "args": ["/path/to/Wechatsync/packages/mcp-server/dist/index.js"],
      "env": {
        "WECHATSYNC_TOKEN": "your-secret-token-here"
      }
    }
  }
}
```

**重要**: `WECHATSYNC_TOKEN` 必须与 Chrome 扩展中设置的 Token 一致。

### 4. 使用

在 Claude Code 中直接对话即可：

```
"帮我把这篇文章同步到知乎和掘金"
"检查下哪些平台已登录"
"上传这张图片到微博图床"
```

## 远程部署

### 1. 在服务器上启动 MCP Server

```bash
# 设置 Token
export WECHATSYNC_TOKEN="your-secret-token-here"

# SSE 模式（推荐，支持远程连接）
pnpm mcp:sse

# 或 stdio 模式
pnpm mcp
```

### 2. 在本地启动桥接服务

```bash
# 设置远程 MCP Server 地址
export RELAY_REMOTE_URL="ws://your-server-ip:9527"

# 启动桥接
pnpm relay
```

桥接服务会在本地监听 `ws://localhost:9527`，Chrome 扩展可以正常连接。

### 3. 配置 Claude Code 连接远程

使用 SSE 模式连接远程服务器：

```json
{
  "mcpServers": {
    "sync-assistant": {
      "url": "http://your-server-ip:9528/sse"
    }
  }
}
```

### 桥接服务环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `RELAY_REMOTE_URL` | ✅ | - | 远程 MCP Server 地址，如 `ws://1.2.3.4:9527` |
| `RELAY_LOCAL_PORT` | ❌ | 9527 | 本地监听端口 |
| `RELAY_RECONNECT_INTERVAL` | ❌ | 5000 | 断线重连间隔（毫秒） |

## 可用 Tools

### list_platforms

列出所有支持的平台及其登录状态。

```
参数:
- forceRefresh: boolean (可选) - 是否强制刷新登录状态
```

### check_auth

检查指定平台的登录状态。

```
参数:
- platform: string (必需) - 平台 ID，如 zhihu, juejin, toutiao
```

### sync_article

同步文章到指定平台（保存为草稿）。

```
参数:
- platforms: string[] (必需) - 目标平台 ID 列表
- title: string (必需) - 文章标题（纯文本，不含 # 号）
- markdown: string (必需) - 文章正文内容（Markdown 格式，推荐）
- content: string (可选) - 文章内容（HTML 格式，如提供 markdown 则可忽略）
- cover: string (可选) - 封面图 URL 或 base64 data URI
```

### extract_article

从当前浏览器页面提取文章内容。

### upload_image_file

从本地文件上传图片到图床平台，返回公开访问的 URL。

```
参数:
- filePath: string (必需) - 本地图片文件的绝对路径
- platform: string (可选) - 图床平台，默认 weibo
  可选值: weibo, zhihu, juejin, jianshu, woshipm
```

## 支持的平台

| 平台 | ID | 图片上传 |
|-----|-----|---------|
| 知乎 | zhihu | ✅ |
| 掘金 | juejin | ✅ |
| 头条号 | toutiao | ✅ |
| CSDN | csdn | ✅ |
| 简书 | jianshu | ✅ |
| 微博 | weibo | ✅ |
| B站专栏 | bilibili | ✅ |
| 百家号 | baijiahao | ✅ |
| 人人都是产品经理 | woshipm | ✅ |
| 大鱼号 | dayu | ✅ |

## 环境变量

### MCP Server

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `WECHATSYNC_TOKEN` | - | 安全验证 Token（推荐设置） |
| `MCP_TOKEN` | - | 同上（兼容旧名称） |
| `SYNC_WS_PORT` | 9527 | WebSocket 端口 |
| `SYNC_HTTP_PORT` | 9528 | HTTP 端口（SSE 模式） |
| `SYNC_WS_HOST` | 0.0.0.0 | 监听地址 |

### MCP Relay

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `RELAY_REMOTE_URL` | - | 远程 MCP Server 地址（必填） |
| `RELAY_LOCAL_PORT` | 9527 | 本地监听端口 |
| `RELAY_RECONNECT_INTERVAL` | 5000 | 重连间隔（毫秒） |

## 开发

```bash
# 监听模式
pnpm --filter @wechatsync/mcp-server dev

# 构建
pnpm build:mcp

# 构建 relay
pnpm build:relay

# 运行 stdio 模式
pnpm mcp

# 运行 SSE 模式
pnpm mcp:sse

# 运行 relay
RELAY_REMOTE_URL=ws://server:9527 pnpm relay
```

## 故障排除

### Extension 未连接

确保：
1. Chrome 扩展已安装并启用
2. 扩展设置中「MCP 连接」已开启
3. Token 设置正确且与 MCP Server 一致
4. 如果是远程部署，确认 relay 服务已启动

### 远程连接失败

1. 检查服务器防火墙是否开放 9527/9528 端口
2. 确认 `RELAY_REMOTE_URL` 地址正确
3. 检查服务器端 MCP Server 是否正常运行
4. 查看 relay 日志确认连接状态

### 图片上传失败

1. 检查目标平台是否已登录
2. 尝试换一个图床平台（如从 weibo 换到 juejin）
3. 检查图片格式是否支持（png, jpg, gif, webp）

## 安全建议

1. **设置强 Token**：使用足够长且复杂的 Token
2. **生产环境使用 WSS**：配置 Nginx 反向代理 + SSL 证书
3. **限制访问**：使用防火墙限制访问来源 IP
4. **定期更换 Token**：建议定期更换 Token
