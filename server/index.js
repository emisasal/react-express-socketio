import express from "express"
import http from "http"
import { Server as SocketServer } from "socket.io"

const app = express()
const server = http.createServer(app)
const io = new SocketServer(server, {
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
})

server.listen(4000)
console.log("Server is running on port 4000")
