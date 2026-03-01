# MCP Relay

本地桥接服务，连接本地浏览器插件与远程 MCP Server。

## 架构

```
Chrome Plugin <---> 本地 Relay (localhost:9527) <---> 远程 MCP Server
```

## 使用场景

当你从 Chrome 商店安装了浏览器插件（无法修改），但 MCP Server 部署在远程服务器时，使用此桥接服务进行中转。

## 安装

```bash
pnpm install
pnpm build
```

## 使用

```bash
# 设置远程 MCP Server 地址
export RELAY_REMOTE_URL="ws://your-server:9527"

# 可选：设置本地监听端口（默认 9527）
export RELAY_LOCAL_PORT="9527"

# 可选：设置重连间隔（默认 5000ms）
export RELAY_RECONNECT_INTERVAL="5000"

# 启动
pnpm start
```

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `RELAY_REMOTE_URL` | 是 | - | 远程 MCP Server 地址，如 `ws://your-server:9527` |
| `RELAY_LOCAL_PORT` | 否 | 9527 | 本地监听端口 |
| `RELAY_RECONNECT_INTERVAL` | 否 | 5000 | 断线重连间隔（毫秒） |

## 安全建议

1. **使用 WSS**：生产环境建议使用 `wss://` 加密连接
2. **Token 验证**：确保远程 MCP Server 配置了 `WECHATSYNC_TOKEN`，插件端也需要配置相同 Token
