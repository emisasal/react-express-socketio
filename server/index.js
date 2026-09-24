import express from "express"
import http from "http"
import { Server } from "socket.io"

const PORT = 4000
const NAME_LIMIT = 24

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    checkInterval: 1000,
    maxRetries: 5,
  },
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  },
})

const log = (event, details = {}) => {
  const time = new Date().toLocaleTimeString("en-GB", { hour12: false })
  const extra = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${value}`)
    .join("  ")

  console.log(`${time}  ${event.padEnd(12)}${extra}`)
}

const preview = (body) => {
  const text = String(body ?? "")
    .replace(/\s+/g, " ")
    .trim()
  const clipped = text.length > 80 ? `${text.slice(0, 77)}...` : text
  return JSON.stringify(clipped)
}

const cleanName = (value) => {
  if (typeof value !== "string") return ""
  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_LIMIT)
}

const clientCount = (excluding) => {
  const count = io.sockets.sockets.size
  if (excluding && io.sockets.sockets.has(excluding)) return count - 1
  return count
}

io.engine.on("connection_error", (error) => {
  log("error", { code: error.code, message: error.message })
})

io.on("connection", (socket) => {
  socket.data.name = ""

  log("connect", {
    id: socket.id,
    clients: clientCount(),
    recovered: socket.recovered ? "yes" : undefined,
  })

  socket.on("name", (value) => {
    const name = cleanName(value)
    if (name === socket.data.name) return
    socket.data.name = name
    log("name", { id: socket.id, name: name || "(cleared)" })
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

    log("message", {
      id: socket.id,
      name: name || undefined,
      text: preview(body),
      chars: body.length,
      recipients: Math.max(clientCount() - 1, 0),
    })
  })

  socket.on("disconnect", (reason) => {
    log("disconnect", {
      id: socket.id,
      reason,
      clients: clientCount(socket.id),
    })
  })
})

server.on("error", (error) => {
  log("error", { message: error.message })
})

server.listen(PORT, () => {
  log("listening", { url: `http://localhost:${PORT}` })
})
