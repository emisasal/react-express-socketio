import express from "express"
import http from "http"
import { Server, type Socket } from "socket.io"
import type {
  ChatMessage,
  ClientToServerEvents,
  ServerToClientEvents,
} from "../shared/events.ts"

const NAME_LIMIT = 24
const BODY_LIMIT = 500
const HISTORY_LIMIT = 50

export type ChatServerOptions = {
  staticDir?: string
  corsOrigins?: string[]
}

type SocketData = {
  name: string
}

type ChatSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>

export const log = (event: string, detail = "") => {
  const time = new Date().toLocaleTimeString("en-GB", { hour12: false })
  console.log(detail ? `${time}  ${event.padEnd(11)} ${detail}` : `${time}  ${event}`)
}

const who = (socket: ChatSocket) => socket.data.name || socket.id.slice(-4)

const preview = (body: string) => {
  const text = body.replace(/\s+/g, " ").trim()
  const clipped = text.length > 80 ? `${text.slice(0, 77)}...` : text
  return JSON.stringify(clipped)
}

const cleanName = (value: unknown) => {
  if (typeof value !== "string") return ""
  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_LIMIT)
}

const cleanBody = (value: unknown) => {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, BODY_LIMIT)
}

export const createChatServer = ({
  staticDir,
  corsOrigins = [],
}: ChatServerOptions = {}) => {
  const app = express()
  if (staticDir) app.use(express.static(staticDir))
  const server = http.createServer(app)
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(server, {
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
    },
    ...(corsOrigins.length > 0 ? { cors: { origin: corsOrigins } } : {}),
  })

  const clientCount = (excluding?: string) => {
    const count = io.sockets.sockets.size
    if (excluding && io.sockets.sockets.has(excluding)) return count - 1
    return count
  }

  io.engine.on("connection_error", (error: { code: number; message: string }) => {
    log("error", error.message)
  })

  const history: ChatMessage[] = []

  io.on("connection", (socket: ChatSocket) => {
    socket.data.name = ""

    log(
      "connect",
      `${who(socket)} · ${clientCount()} online${socket.recovered ? " · recovered" : ""}`,
    )

    socket.on("name", (value) => {
      socket.data.name = cleanName(value)
    })

    socket.on("history", () => {
      socket.emit("history", [...history])
    })

    socket.on("message", (payload) => {
      const body = cleanBody(payload?.body)
      if (!body) return

      const name = socket.data.name
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        body,
        from: socket.id,
        name: name || undefined,
        sentAt: Date.now(),
      }
      history.push(message)
      if (history.length > HISTORY_LIMIT) history.shift()

      io.emit("message", message)
      log("message", `${who(socket)} · ${preview(body)}`)
    })

    socket.on("disconnect", (reason) => {
      const unusual =
        reason === "client namespace disconnect" || reason === "transport close"
          ? ""
          : ` · ${reason}`
      log("disconnect", `${who(socket)} · ${clientCount(socket.id)} online${unusual}`)
    })
  })

  server.on("error", (error: NodeJS.ErrnoException) => {
    log("error", error.message)
  })

  return { server, io }
}
