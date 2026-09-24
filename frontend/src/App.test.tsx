import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import App from "./App.tsx"

type IncomingMessage = {
  id: string
  body: string
  from: string
  name?: string
  sentAt: number
}

const { socket, resetSocket, receiveMessage, receiveHistory } = vi.hoisted(() => {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>()
  const socket = {
    connected: true,
    id: "abcdefghijklmnop",
    on(event: string, handler: (...args: unknown[]) => void) {
      const current = handlers.get(event) ?? new Set()
      current.add(handler)
      handlers.set(event, current)
      return socket
    },
    off(event: string, handler: (...args: unknown[]) => void) {
      handlers.get(event)?.delete(handler)
      return socket
    },
    emit: vi.fn(),
  }

  return {
    socket,
    resetSocket() {
      handlers.clear()
      socket.emit.mockClear()
    },
    receiveMessage(message: IncomingMessage) {
      handlers.get("message")?.forEach((handler) => handler(message))
    },
    receiveHistory(messages: IncomingMessage[]) {
      handlers.get("history")?.forEach((handler) => handler(messages))
    },
  }
})

vi.mock("socket.io-client", () => ({
  io: () => socket,
}))

describe("chat app", () => {
  beforeEach(() => {
    sessionStorage.clear()
    resetSocket()
  })

  it("starts with a name field and an empty conversation", async () => {
    render(<App />)

    expect(await screen.findByRole("status")).toHaveTextContent("Connected")
    expect(screen.getByRole("textbox", { name: "Your name" })).toBeInTheDocument()
    expect(screen.getByText("No messages yet. Say hello.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled()
  })

  it("shows a saved name instead of the input", async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole("textbox", { name: "Your name" }), "Ada")
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(screen.getByText("Ada")).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "Your name" })).not.toBeInTheDocument()
    expect(socket.emit).toHaveBeenCalledWith("name", "Ada")
    expect(screen.getByText("Ada").previousElementSibling).toHaveStyle({
      backgroundColor: expect.any(String),
    })
  })

  it("sends a message under the saved name", async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole("textbox", { name: "Your name" }), "Ada")
    await user.click(screen.getByRole("button", { name: "Save" }))
    await user.type(screen.getByRole("textbox", { name: "Message" }), "Hello")
    await user.click(screen.getByRole("button", { name: "Send" }))

    expect(socket.emit).toHaveBeenCalledWith("message", { body: "Hello" })
    const sentAt = Date.parse("2026-09-24T12:00:00.000Z")
    act(() => {
      receiveMessage({
        id: "own-message",
        body: "Hello",
        from: "abcdefghijklmnop",
        name: "Ada",
        sentAt,
      })
    })

    expect(screen.getByText("Hello")).toBeInTheDocument()
    expect(screen.getByText("Hello").closest("li")?.querySelector("time")).toHaveAttribute(
      "dateTime",
      new Date(sentAt).toISOString(),
    )
  })

  it("shows another person's message with a different color", async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole("textbox", { name: "Your name" }), "Ada")
    await user.click(screen.getByRole("button", { name: "Save" }))
    await user.type(screen.getByRole("textbox", { name: "Message" }), "Hello")
    await user.click(screen.getByRole("button", { name: "Send" }))
    act(() => {
      receiveMessage({
        id: "own-message",
        body: "Hello",
        from: "abcdefghijklmnop",
        name: "Ada",
        sentAt: Date.parse("2026-09-24T12:00:00.000Z"),
      })
      receiveMessage({
        id: "grace-message",
        body: "Hi Ada",
        from: "zzzzzzzzzzzzzzzz",
        name: "Grace",
        sentAt: Date.parse("2026-09-24T12:00:01.000Z"),
      })
    })

    const messages = within(screen.getByLabelText("Messages"))
    expect(messages.getByText("Hi Ada")).toBeInTheDocument()
    const adaDot = messages.getByText("Ada").querySelector("[aria-hidden]")
    const graceDot = messages.getByText("Grace").querySelector("[aria-hidden]")
    expect(adaDot?.getAttribute("style")).toContain("background-color")
    expect(graceDot?.getAttribute("style")).toContain("background-color")
    expect(graceDot?.getAttribute("style")).not.toBe(adaDot?.getAttribute("style"))
  })

  it("shows recent messages from the server when joining", async () => {
    render(<App />)
    await screen.findByRole("status")
    const sentAt = Date.parse("2026-09-24T12:04:00.000Z")

    act(() => {
      receiveHistory([
        {
          id: "earlier",
          body: "Already here",
          from: "zzzzzzzzzzzzzzzz",
          name: "Grace",
          sentAt,
        },
      ])
    })

    expect(screen.getByText("Already here")).toBeInTheDocument()
    expect(screen.queryByText("No messages yet. Say hello.")).not.toBeInTheDocument()
    expect(socket.emit).toHaveBeenCalledWith("history")
  })
})
