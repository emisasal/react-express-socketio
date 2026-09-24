import path from "node:path"
import { fileURLToPath } from "node:url"
import { createChatServer, log } from "./chat.ts"

const PORT = Number(process.env.PORT) || 4000
const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
const staticDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../frontend/dist",
)

const { server } = createChatServer({ staticDir, corsOrigins })

server.listen(PORT, () => {
  log("listening", `http://localhost:${PORT}`)
})
