# React Express Socket.io Chat Application

This project is a real-time chat application built with React, Express, and Socket.io. A TypeScript React frontend talks to a TypeScript Express server, and Socket.io delivers each message to everyone who is connected.

## Features

- Real-time messaging between browser tabs
- A display name for each tab, saved for that tab's session
- A stable color next to each person's name
- Connection status in the header
- Server-side message broadcasting. The server keeps the display name, trims it to 24 characters, trims each message, and limits messages to 500 characters
- A short in-memory history, so a new tab sees recent messages with the server's timestamp

## Project Structure

The repository is a pnpm workspace with two packages:

1. Backend (server) at the repository root
2. Frontend (React application) in `frontend`

### Backend

The backend is built with Express and Socket.io. It stores a display name for each connection, keeps the latest 50 messages in memory, and broadcasts each new message with the server's timestamp.

Key files:

- `server/index.ts`: Starts the server. It reads `PORT` (default 4000) and `CORS_ORIGINS`, and serves `frontend/dist`.
- `server/chat.ts`: Express and Socket.io setup, including names, broadcasting, and logs.
- `server/chat.test.ts`: Server tests.
- `shared/events.ts`: Socket.io event types used by the server and the frontend.

### Frontend

The frontend is a React application created with Vite and styled with Tailwind CSS. It provides the chat interface and the Socket.io client.

Key files:

- `frontend/src/App.tsx`: The chat interface, name field, and Socket.io client.
- `frontend/src/App.test.tsx`: Frontend tests.
- `frontend/vite.config.ts`: Vite, Tailwind, and Vitest configuration.

## Getting Started

### Prerequisites

- Node.js (v20.19 or later)
- [pnpm](https://pnpm.io/installation)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd react-express-socketio
   ```

2. Install dependencies for the server and the frontend:
   ```
   pnpm install
   ```

### Running the Application

1. Start the backend server:
   ```
   pnpm dev
   ```

2. In a new terminal, start the frontend development server:
   ```
   pnpm --filter frontend dev
   ```

3. Open `http://localhost:5173` in your browser.

Vite proxies Socket.io to the backend, so the page and the socket share one origin. The frontend also accepts `http://127.0.0.1:5173`. Set `PORT` for both commands when the backend should listen somewhere other than 4000.

## Usage

1. Enter a name and click **Save**. The name is shown as text, and **Edit** brings the field back. Each browser tab keeps its own name.
2. Open the application in another tab or window and save a different name there. That tab also shows the recent messages.
3. Type a message and click **Send** or press Enter.
4. Your message appears on the right. Messages from other people appear on the left, each with that person's color.

The header shows **Connected** while the Socket.io connection is open.

## Development

- The backend uses Node.js `--watch` to reload `server/index.ts` while you work.
- The frontend uses Vite's hot module replacement.
- Prettier formats files on save in this workspace. The Prettier extension is recommended in `.vscode/extensions.json`.
- `pnpm typecheck` checks the server and the frontend.
- `pnpm --filter frontend lint` runs ESLint on the frontend.

### Tests

Run the server and frontend tests:

```
pnpm test
```

Server tests use Vitest and a real Socket.io server. Frontend tests use Vitest, Testing Library, and jsdom.

## Building for Production

1. Typecheck and build the frontend:
   ```
   pnpm build
   ```

2. Start the production server:
   ```
   pnpm start
   ```

3. Open `http://localhost:4000`.

The production server serves the built frontend and the socket on the same origin. Set `VITE_SOCKET_URL` at build time when the socket server lives on another origin, and set `CORS_ORIGINS` to a comma-separated list of page origins that may connect.

## License

This project is licensed under the ISC License.

## Acknowledgements

- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [Socket.io](https://socket.io/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
