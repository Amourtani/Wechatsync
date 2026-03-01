/**
 * MCP Relay - 本地桥接服务
 *
 * 连接本地浏览器插件与远程 MCP Server
 *
 * 架构:
 * Chrome Plugin <---> 本地 Relay (localhost:9527) <---> 远程 MCP Server
 */

import { WebSocketServer, WebSocket, RawData } from 'ws'

const LOCAL_PORT = parseInt(process.env.RELAY_LOCAL_PORT || '9527', 10)
const REMOTE_URL = process.env.RELAY_REMOTE_URL || ''
const RECONNECT_INTERVAL = parseInt(process.env.RELAY_RECONNECT_INTERVAL || '5000', 10)

class McpRelay {
  private localServer: WebSocketServer | null = null
  private remoteWs: WebSocket | null = null
  private localClients: Set<WebSocket> = new Set()
  private isReconnecting = false
  private reconnectTimer: NodeJS.Timeout | null = null

  constructor() {
    if (!REMOTE_URL) {
      console.error('[Relay] Error: RELAY_REMOTE_URL is not set')
      console.error('[Relay] Usage: RELAY_REMOTE_URL=ws://your-server:9527 pnpm start')
      process.exit(1)
    }
  }

  start(): void {
    this.startLocalServer()
    this.connectToRemote()
  }

  private startLocalServer(): void {
    this.localServer = new WebSocketServer({ port: LOCAL_PORT, host: 'localhost' })

    this.localServer.on('listening', () => {
      console.error(`[Relay] Local server listening on ws://localhost:${LOCAL_PORT}`)
    })

    this.localServer.on('connection', (ws) => {
      console.error('[Relay] Local client connected (Chrome Extension)')
      this.localClients.add(ws)

      ws.on('message', (data) => {
        this.handleLocalMessage(data)
      })

      ws.on('close', () => {
        console.error('[Relay] Local client disconnected')
        this.localClients.delete(ws)
      })

      ws.on('error', (error) => {
        console.error('[Relay] Local client error:', error.message)
        this.localClients.delete(ws)
      })
    })

    this.localServer.on('error', (error) => {
      console.error('[Relay] Local server error:', error.message)
      process.exit(1)
    })
  }

  private connectToRemote(): void {
    if (this.remoteWs?.readyState === WebSocket.OPEN) {
      return
    }

    console.error(`[Relay] Connecting to remote: ${REMOTE_URL}`)

    try {
      this.remoteWs = new WebSocket(REMOTE_URL)

      this.remoteWs.on('open', () => {
        console.error('[Relay] Connected to remote MCP Server')
        this.isReconnecting = false
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
        }
      })

      this.remoteWs.on('message', (data) => {
        this.handleRemoteMessage(data)
      })

      this.remoteWs.on('close', () => {
        console.error('[Relay] Disconnected from remote MCP Server')
        this.remoteWs = null
        this.scheduleReconnect()
      })

      this.remoteWs.on('error', (error) => {
        console.error('[Relay] Remote connection error:', error.message)
      })
    } catch (error) {
      console.error('[Relay] Failed to connect:', (error as Error).message)
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.isReconnecting) return
    this.isReconnecting = true

    console.error(`[Relay] Reconnecting in ${RECONNECT_INTERVAL / 1000}s...`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.isReconnecting = false
      this.connectToRemote()
    }, RECONNECT_INTERVAL)
  }

  private handleLocalMessage(data: RawData): void {
    if (this.remoteWs?.readyState === WebSocket.OPEN) {
      this.remoteWs.send(data)
      const msg = data.toString()
      try {
        const parsed = JSON.parse(msg)
        console.error(`[Relay] -> Remote: ${parsed.method || 'response'}`)
      } catch {
        console.error('[Relay] -> Remote: (binary or invalid JSON)')
      }
    } else {
      console.error('[Relay] Cannot forward: remote not connected')
    }
  }

  private handleRemoteMessage(data: RawData): void {
    const msg = data.toString()
    
    for (const client of this.localClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg)
      }
    }

    try {
      const parsed = JSON.parse(msg)
      console.error(`[Relay] <- Remote: ${parsed.method || 'response'}`)
    } catch {
      console.error('[Relay] <- Remote: (binary or invalid JSON)')
    }
  }

  stop(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.remoteWs) {
      this.remoteWs.close()
      this.remoteWs = null
    }

    if (this.localServer) {
      this.localServer.close()
      this.localServer = null
    }

    for (const client of this.localClients) {
      client.close()
    }
    this.localClients.clear()

    console.error('[Relay] Stopped')
  }
}

const relay = new McpRelay()

relay.start()

process.on('SIGINT', () => {
  console.error('[Relay] Shutting down...')
  relay.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.error('[Relay] Shutting down...')
  relay.stop()
  process.exit(0)
})
