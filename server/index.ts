import express from "express"
import http from "http"
import { Server, type Socket } from "socket.io"

const PORT = 4000
const NAME_LIMIT = 24

type ChatMessage = {
  body: string
  from: string
  name?: string
}

type ClientToServerEvents = {
  message: (payload: string | { body?: unknown; name?: unknown }) => void
  name: (value: unknown) => void
}

type ServerToClientEvents = {
  message: (message: ChatMessage) => void
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

const app = express()
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
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  },
})

const log = (event: string, detail = "") => {
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

const clientCount = (excluding?: string) => {
  const count = io.sockets.sockets.size
  if (excluding && io.sockets.sockets.has(excluding)) return count - 1
  return count
}

io.engine.on("connection_error", (error: { code: number; message: string }) => {
  log("error", error.message)
})

io.on("connection", (socket: ChatSocket) => {
  socket.data.name = ""

  log(
    "connect",
    `${who(socket)} · ${clientCount()} online${socket.recovered ? " · recovered" : ""}`,
  )

  socket.on("name", (value) => {
    socket.data.name = cleanName(value)
  })

  socket.on("message", (payload) => {
    const body = typeof payload === "string" ? payload : payload?.body
    if (typeof body !== "string") return

    const name = cleanName(
      typeof payload === "string" ? socket.data.name : payload?.name,
    )
    socket.data.name = name

    socket.broadcast.emit("message", {
      body,
      from: socket.id,
      name: name || undefined,
    })

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

server.listen(PORT, () => {
  log("listening", `http://localhost:${PORT}`)
})
