import { mkdtemp, writeFile } from "node:fs/promises"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import path from "node:path"
import { io, type Socket } from "socket.io-client"
import { afterEach, describe, expect, it } from "vitest"
import type { ChatMessage } from "../shared/events.ts"
import { createChatServer, type ChatServerOptions } from "./chat.ts"

const openServers: Array<{ close: () => Promise<void> }> = []

const startServer = async (options?: ChatServerOptions) => {
  const { server, io: chat } = createChatServer(options)
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve())
  })

  const address = server.address() as AddressInfo
  const running = {
    port: address.port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        chat.close()
        server.close((error) => (error ? reject(error) : resolve()))
      }),
  }
  openServers.push(running)
  return running
}

const connect = async (port: number) => {
  const socket = io(`http://127.0.0.1:${port}`, {
    transports: ["websocket"],
  })
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve())
    socket.once("connect_error", reject)
  })
  return socket
}

const nextMessage = (socket: Socket) =>
  new Promise<ChatMessage>((resolve) => {
    socket.once("message", resolve)
  })

const nextHistory = (socket: Socket) =>
  new Promise<ChatMessage[]>((resolve) => {
    socket.once("history", resolve)
  })

const waitFor = (socket: Socket, count: number) =>
  new Promise<void>((resolve) => {
    let seen = 0
    socket.on("message", () => {
      seen += 1
      if (seen === count) resolve()
    })
  })

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => server.close()))
})

describe("chat server", () => {
  it("broadcasts a trimmed message under the name stored for that socket", async () => {
    const running = await startServer()
    const ada = await connect(running.port)
    const grace = await connect(running.port)
    const received = nextMessage(grace)
    const sentAt = Date.now()

    ada.emit("name", "  Ada \n Lovelace  ")
    ada.emit("message", { body: "  Hello there  ", name: "Grace" })

    const message = await received
    expect(message).toMatchObject({
      body: "Hello there",
      from: ada.id,
      name: "Ada Lovelace",
    })
    expect(message.id).toEqual(expect.any(String))
    expect(message.sentAt).toBeGreaterThanOrEqual(sentAt)
    expect(message.sentAt).toBeLessThanOrEqual(Date.now())
    ada.close()
    grace.close()
  })

  it("delivers the same stored message to the sender", async () => {
    const running = await startServer()
    const ada = await connect(running.port)
    const grace = await connect(running.port)
    const toAda = nextMessage(ada)
    const toGrace = nextMessage(grace)

    ada.emit("name", "Ada")
    ada.emit("message", { body: "Hello" })

    const [adaMessage, graceMessage] = await Promise.all([toAda, toGrace])
    expect(adaMessage).toEqual(graceMessage)
    ada.close()
    grace.close()
  })

  it("limits names to 24 characters and strips control characters", async () => {
    const running = await startServer()
    const ada = await connect(running.port)
    const grace = await connect(running.port)
    const received = nextMessage(grace)

    ada.emit("name", "Ada\u0000 Lovelace invented code")
    ada.emit("message", { body: "Hi" })

    await expect(received).resolves.toMatchObject({
      name: "Ada Lovelace invented co",
    })
    ada.close()
    grace.close()
  })

  it("trims and caps the body at 500 characters", async () => {
    const running = await startServer()
    const ada = await connect(running.port)
    const grace = await connect(running.port)
    const received = nextMessage(grace)

    ada.emit("message", { body: `  ${"a".repeat(600)}  ` })

    const message = await received
    expect(message.body).toBe("a".repeat(500))
    expect(message.name).toBeUndefined()
    ada.close()
    grace.close()
  })

  it("ignores a message whose body is not text, blank, or a raw string", async () => {
    const running = await startServer()
    const ada = await connect(running.port)
    const grace = await connect(running.port)
    let delivered = false
    grace.on("message", () => {
      delivered = true
    })

    ada.emit("message", { body: 12 })
    ada.emit("message", { body: "   " })
    ada.emit("message", "Hello")
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(delivered).toBe(false)
    ada.close()
    grace.close()
  })

  it("sends recent messages to a client that asks for history", async () => {
    const running = await startServer()
    const ada = await connect(running.port)
    const grace = await connect(running.port)
    const posted = waitFor(grace, 51)

    ada.emit("name", "Ada")
    for (let index = 0; index < 51; index += 1) {
      ada.emit("message", { body: `m${index}` })
    }
    await posted

    const bea = await connect(running.port)
    const received = nextHistory(bea)
    bea.emit("history")
    const messages = await received

    expect(messages).toHaveLength(50)
    expect(messages[0]).toMatchObject({ body: "m1", name: "Ada", from: ada.id })
    expect(messages[49]).toMatchObject({ body: "m50", name: "Ada" })
    expect(messages[0].sentAt).toBeLessThanOrEqual(messages[49].sentAt)
    ada.close()
    grace.close()
    bea.close()
  })

  it("serves the frontend build", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "chat-"))
    await writeFile(path.join(dir, "index.html"), "<title>Chat</title>")
    const running = await startServer({ staticDir: dir })

    const response = await fetch(`http://127.0.0.1:${running.port}/`)

    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toContain("<title>Chat</title>")
  })

  it("allows a browser origin from the server options", async () => {
    const running = await startServer({ corsOrigins: ["http://example.test"] })

    const response = await fetch(
      `http://127.0.0.1:${running.port}/socket.io/?EIO=4&transport=polling`,
      { headers: { Origin: "http://example.test" } },
    )

    expect(response.headers.get("access-control-allow-origin")).toBe("http://example.test")
  })
})
