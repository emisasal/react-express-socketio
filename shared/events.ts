export type ChatMessage = {
  id: string
  body: string
  from: string
  name?: string
  sentAt: number
}

export type ClientToServerEvents = {
  message: (payload: { body: string }) => void
  name: (value: string) => void
  history: () => void
}

export type ServerToClientEvents = {
  message: (message: ChatMessage) => void
  history: (messages: ChatMessage[]) => void
}
