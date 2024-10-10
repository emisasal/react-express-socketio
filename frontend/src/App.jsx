import { useEffect, useState } from "react"
import io from "socket.io-client"

const socket = io("http://localhost:4000")

const App = () => {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([])

  const handleSubmit = (e) => {
    e.preventDefault()
    const newMessage = {
      body: message,
      from: "Me",
    }
    setMessages((messages) => [...messages, newMessage])
    socket.emit("message", message) // Send the message to the server
  }

  useEffect(() => {
    socket.on("message", recieveMessage) // Listen for messages from the server

    return () => {
      socket.off("message", recieveMessage) // Clean up the listener when the component unmounts
    }
  }, [])

  // Preserves the previous state and adds the new message
  const recieveMessage = (message) =>
    setMessages((messages) => [...messages, message])

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter your message"
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>

      <ul>
        {messages.map((message, index) => (
          <li key={index}>
            {message.from}:{message.body}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
