import { createChatServer, log } from "./chat.ts"

const PORT = 4000
const { server } = createChatServer()

server.listen(PORT, () => {
  log("listening", `http://localhost:${PORT}`)
})
