import express from "express"
import http from "http"
import { Server } from "socket.io"

const PORT = 4000

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    checkInterval: 1000,
    maxRetries: 5,
  },
  cors: { origin: "http://localhost:5173" },
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

const clientCount = (excluding) => {
  const count = io.sockets.sockets.size
  if (excluding && io.sockets.sockets.has(excluding)) return count - 1
  return count
}

io.engine.on("connection_error", (error) => {
  log("error", { code: error.code, message: error.message })
})

io.on("connection", (socket) => {
  log("connect", {
    id: socket.id,
    clients: clientCount(),
    recovered: socket.recovered ? "yes" : undefined,
  })

  socket.on("message", (body) => {
    socket.broadcast.emit("message", {
      body,
      from: socket.id,
    })

    log("message", {
      id: socket.id,
      text: preview(body),
      chars: typeof body === "string" ? body.length : undefined,
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
