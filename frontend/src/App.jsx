import { useEffect, useId, useRef, useState } from "react"
import io from "socket.io-client"

const socket = io("http://localhost:4000")

const formatTime = (date) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)

const shortId = (id) => id.slice(-4)

const App = () => {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([])
  const [connected, setConnected] = useState(socket.connected)
  const listRef = useRef(null)
  const inputId = useId()
  const trimmed = message.trim()

  useEffect(() => {
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onMessage = (incoming) => {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          body: incoming.body,
          from: incoming.from,
          at: new Date(),
        },
      ])
    }

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("message", onMessage)

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("message", onMessage)
    }
  }, [])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    list.scrollTop = list.scrollHeight
  }, [messages])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!trimmed || !connected) return

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        body: trimmed,
        from: "Me",
        at: new Date(),
      },
    ])
    socket.emit("message", trimmed)
    setMessage("")
  }

  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col border-x border-line bg-panel max-sm:border-x-0">
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 pt-5 pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Chat</h1>
          <p className="mt-1 text-sm text-muted">
            Messages are shared with everyone currently online.
          </p>
        </div>
        <p
          className={`m-0 inline-flex items-center gap-2 rounded-full bg-other px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${connected ? "text-accent" : "text-muted"}`}
          role="status"
        >
          <span className="size-2 rounded-full bg-current" aria-hidden="true" />
          {connected ? "Connected" : "Reconnecting"}
        </p>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto p-5"
        ref={listRef}
        aria-label="Messages"
      >
        {messages.length === 0 ? (
          <p className="grid h-full place-items-center text-center text-muted">
            No messages yet. Say hello.
          </p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
            {messages.map((item) => {
              const mine = item.from === "Me"
              const author = mine ? "You" : `Guest ${shortId(item.from)}`

              return (
                <li
                  key={item.id}
                  className={`flex max-w-[85%] flex-col ${mine ? "items-end self-end" : "items-start"}`}
                >
                  <p className="mb-1 flex gap-2 px-0.5 text-xs text-muted">
                    <span className="font-semibold text-ink">{author}</span>
                    <time dateTime={item.at.toISOString()}>
                      {formatTime(item.at)}
                    </time>
                  </p>
                  <p
                    className={`m-0 px-3.5 py-2.5 leading-snug wrap-anywhere whitespace-pre-wrap ${mine ? "rounded-2xl rounded-br-md bg-mine text-mine-ink" : "rounded-2xl rounded-bl-md bg-other"}`}
                  >
                    {item.body}
                  </p>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      <form
        className="border-t border-line px-5 pt-3.5 pb-[calc(0.85rem+env(safe-area-inset-bottom))]"
        onSubmit={handleSubmit}
      >
        <label className="sr-only" htmlFor={inputId}>
          Message
        </label>
        <div className="flex gap-2.5">
          <input
            id={inputId}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-paper px-3.5 text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            type="text"
            value={message}
            placeholder="Write a message"
            autoComplete="off"
            enterKeyHint="send"
            maxLength={500}
            onChange={(event) => setMessage(event.target.value)}
          />
          <button
            className="min-h-11 cursor-pointer rounded-xl bg-accent px-4 font-semibold text-mine-ink disabled:cursor-not-allowed disabled:opacity-40"
            type="submit"
            disabled={!trimmed || !connected}
          >
            Send
          </button>
        </div>
      </form>
    </main>
  )
}

export default App
