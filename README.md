# React Express Socket.io Chat Application

This project is a real-time chat application built using React, Express, and Socket.io. It demonstrates how to create a simple yet functional chat system with a React frontend and an Express backend, utilizing Socket.io for real-time communication.

## Features

- Real-time messaging
- Simple and intuitive user interface
- Server-side message broadcasting

## Project Structure

The project is divided into two main parts:

1. Backend (Server)
2. Frontend (React Application)

### Backend

The backend is built with Express and Socket.io. It's responsible for handling real-time communication between clients.

Key files:
- `server/index.ts`: Contains the Express server setup and Socket.io logic.

### Frontend

The frontend is a React application created with Vite. It provides the user interface for the chat application.

Key files:
- `frontend/src/App.tsx`: The main React component that handles the chat interface and Socket.io client-side logic.
- `frontend/vite.config.js`: Configuration file for Vite.

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

2. Install dependencies:
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

3. Open your browser and navigate to `http://localhost:5173` to use the chat application.

## Usage

1. Open the application in multiple browser windows or tabs.
2. Type a message in the input field and click "Send" or press Enter.
3. The message will appear in all open instances of the application.

## Development

- The backend server uses Node.js `--watch` flag for auto-reloading during development.
- The frontend uses Vite's hot module replacement for a smooth development experience.

## Building for Production

1. Build the frontend:
   ```
   pnpm build
   ```

2. Start the production server:
   ```
   pnpm start
   ```

## License

This project is licensed under the ISC License.

## Acknowledgements

- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [Socket.io](https://socket.io/)
- [Vite](https://vitejs.dev/)
