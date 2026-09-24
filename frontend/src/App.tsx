import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import { io, type Socket } from "socket.io-client"

type IncomingMessage = {
  id: string
  body: string
  from: string
  name?: string
  sentAt: number
}

type ClientToServerEvents = {
  message: (payload: { body: string }) => void
  name: (value: string) => void
  history: () => void
}

type ServerToClientEvents = {
  message: (message: IncomingMessage) => void
  history: (messages: IncomingMessage[]) => void
}

type ChatMessage = {
  id: string
  body: string
  from: string
  name: string
  mine: boolean
  at: Date
}

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  "http://localhost:4000",
)
const NAME_LIMIT = 24
const NAME_STORAGE_KEY = "chat-name"
const USER_COLORS = [
  "#e11d48",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0d9488",
  "#0284c7",
  "#4f46e5",
  "#9333ea",
  "#db2777",
  "#475569",
]

const cleanName = (value: string) =>
  value.replace(/\s+/g, " ").trim().slice(0, NAME_LIMIT)

const readStoredName = () => {
  try {
    return sessionStorage.getItem(NAME_STORAGE_KEY) ?? ""
  } catch {
    return ""
  }
}

const colorFor = (id: string) => {
  if (!id) return USER_COLORS[USER_COLORS.length - 1]
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0
  }
  return USER_COLORS[hash % USER_COLORS.length]
}

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)

const shortId = (id: string) => id.slice(-4)

const toMessage = (incoming: IncomingMessage): ChatMessage => ({
  id: incoming.id,
  body: incoming.body,
  from: incoming.from,
  name: incoming.name || "",
  mine: incoming.from === socket.id,
  at: new Date(incoming.sentAt),
})

const App = () => {
  const storedName = readStoredName()
  const [savedName, setSavedName] = useState(storedName)
  const [draftName, setDraftName] = useState(storedName)
  const [editingName, setEditingName] = useState(!storedName)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(socket.connected)
  const [userId, setUserId] = useState(socket.id ?? "")
  const listRef = useRef<HTMLDivElement>(null)
  const nameId = useId()
  const inputId = useId()
  const trimmed = message.trim()
  const draftDisplayName = cleanName(draftName)

  useEffect(() => {
    const onConnect = () => {
      setConnected(true)
      setUserId(socket.id ?? "")
      socket.emit("history")
    }
    const onDisconnect = () => setConnected(false)
    const onHistory = (incoming: IncomingMessage[]) => {
      setMessages((current) => {
        const byId = new Map(current.map((item) => [item.id, item]))
        for (const item of incoming) byId.set(item.id, toMessage(item))
        return [...byId.values()].sort((a, b) => a.at.getTime() - b.at.getTime())
      })
    }
    const onMessage = (incoming: IncomingMessage) => {
      setMessages((current) => {
        if (current.some((item) => item.id === incoming.id)) return current
        return [...current, toMessage(incoming)]
      })
    }

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("history", onHistory)
    socket.on("message", onMessage)
    queueMicrotask(() => {
      if (!socket.connected) return
      setConnected(true)
      setUserId(socket.id ?? "")
      socket.emit("history")
    })

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("history", onHistory)
      socket.off("message", onMessage)
    }
  }, [])

  useEffect(() => {
    const sendName = () => socket.emit("name", savedName)
    socket.on("connect", sendName)
    if (socket.connected) sendName()
    return () => {
      socket.off("connect", sendName)
    }
  }, [savedName])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    list.scrollTop = list.scrollHeight
  }, [messages])

  const saveName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draftDisplayName) return

    try {
      sessionStorage.setItem(NAME_STORAGE_KEY, draftDisplayName)
    } catch {
      // Ignore storage failures in private browsing.
    }

    setSavedName(draftDisplayName)
    setDraftName(draftDisplayName)
    setEditingName(false)
    socket.emit("name", draftDisplayName)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!trimmed || !connected || !socket.id) return

    socket.emit("message", { body: trimmed })
    setMessage("")
  }

  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col border-x border-line bg-panel max-sm:border-x-0">
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 pt-5 pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Chat</h1>
          {editingName ? (
            <form className="mt-3 flex items-end gap-2" onSubmit={saveName}>
              <div className="min-w-0 flex-1">
                <label
                  className="block text-xs font-semibold text-muted"
                  htmlFor={nameId}
                >
                  Your name
                </label>
                <input
                  id={nameId}
                  className="mt-1 w-full max-w-xs min-h-11 rounded-xl border border-line bg-paper px-3.5 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  type="text"
                  value={draftName}
                  maxLength={NAME_LIMIT}
                  placeholder="Shown on your messages"
                  autoComplete="nickname"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setDraftName(event.target.value)
                  }
                />
              </div>
              <button
                className="min-h-11 cursor-pointer rounded-xl bg-accent px-4 text-sm font-semibold text-mine-ink disabled:cursor-not-allowed disabled:opacity-40"
                type="submit"
                disabled={!draftDisplayName}
              >
                Save
              </button>
            </form>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: colorFor(userId) }}
                aria-hidden="true"
              />
              <p className="text-sm font-semibold">{savedName}</p>
              <button
                className="cursor-pointer text-sm font-medium text-muted underline decoration-line/80 underline-offset-2"
                type="button"
                onClick={() => {
                  setDraftName(savedName)
                  setEditingName(true)
                }}
              >
                Edit
              </button>
            </div>
          )}
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
              const author = item.mine
                ? item.name || "You"
                : item.name || `Guest ${shortId(item.from)}`

              return (
                <li
                  key={item.id}
                  className={`flex max-w-[85%] flex-col ${item.mine ? "items-end self-end" : "items-start"}`}
                >
                  <p className="mb-1 flex items-center gap-2 px-0.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: colorFor(item.from) }}
                        aria-hidden="true"
                      />
                      {author}
                    </span>
                    <time dateTime={item.at.toISOString()}>
                      {formatTime(item.at)}
                    </time>
                  </p>
                  <p
                    className={`m-0 px-3.5 py-2.5 leading-snug wrap-anywhere whitespace-pre-wrap ${item.mine ? "rounded-2xl rounded-br-md bg-mine text-mine-ink" : "rounded-2xl rounded-bl-md bg-other"}`}
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
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setMessage(event.target.value)
            }
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
