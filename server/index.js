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

io.on("connection", (socket) => {
  console.log("A user connected") // Log when a user connects

  socket.on("message", (body) => {
    socket.broadcast.emit("message", {
      body,
      from: socket.id,
    }) // Broadcast the message to all connected clients
  })

  socket.on("disconnect", () => {
    console.log("A user disconnected") // Log when a user disconnects
  })
})

server.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`)
})
