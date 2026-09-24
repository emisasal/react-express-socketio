import type { AddressInfo } from "node:net"
import { io, type Socket } from "socket.io-client"
import { afterEach, describe, expect, it } from "vitest"
import { createChatServer } from "./chat.ts"

type ChatMessage = {
  body: string
  from: string
  name?: string
}

const openServers: Array<{ close: () => Promise<void> }> = []

const startServer = async () => {
  const { server, io: chat } = createChatServer()
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

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => server.close()))
})

describe("chat server", () => {
  it("broadcasts a message to other clients with a cleaned name", async () => {
    const running = await startServer()
    const ada = await connect(running.port)
    const grace = await connect(running.port)
    const received = nextMessage(grace)

    ada.emit("message", { body: "Hello there", name: "  Ada \n Lovelace  " })

    await expect(received).resolves.toEqual({
      body: "Hello there",
      from: ada.id,
      name: "Ada Lovelace",
    })
    ada.close()
    grace.close()
  })

  it("does not send a message back to the sender", async () => {
    const running = await startServer()
    const ada = await connect(running.port)
    const grace = await connect(running.port)
    let echoed = false
    ada.on("message", () => {
      echoed = true
    })

    ada.emit("message", { body: "Hello", name: "Ada" })
    await nextMessage(grace)

    expect(echoed).toBe(false)
    ada.close()
    grace.close()
  })

  it("limits names to 24 characters and strips control characters", async () => {
    const running = await startServer()
    const ada = await connect(running.port)
    const grace = await connect(running.port)
    const received = nextMessage(grace)

    ada.emit("message", {
      body: "Hi",
      name: "Ada\u0000 Lovelace invented code",
    })

    await expect(received).resolves.toMatchObject({
      name: "Ada Lovelace invented co",
    })
    ada.close()
    grace.close()
  })

  it("ignores a message whose body is not text", async () => {
    const running = await startServer()
    const ada = await connect(running.port)
    const grace = await connect(running.port)
    let delivered = false
    grace.on("message", () => {
      delivered = true
    })

    ada.emit("message", { body: 12, name: "Ada" })
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(delivered).toBe(false)
    ada.close()
    grace.close()
  })
})
