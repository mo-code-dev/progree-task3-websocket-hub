# Real-Time WebSocket Communication Hub

A concurrent real-time communication hub featuring multi-channel chat routing, Redis-backed in-memory presence caching, and append-only file transaction logging. Built with modern TypeScript on top of Express and Socket.io.

## Tech Stack

- **Runtime & Language**: Node.js, TypeScript
- **Web & WebSockets**: Express, Socket.io, CORS
- **Presence & Cache**: Redis (Docker Compose), ioredis
- **Development Tooling**: tsx, Docker Compose

## Getting Started

### Prerequisites

- Node.js (v18+) and npm
- Docker and Docker Compose

### Setup and Run

1. Start the Redis container:
   ```bash
   docker compose up -d
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open the browser client at:
   ```
   http://localhost:5001
   ```

### Production Build

```bash
npm run build
npm start
```

## Socket.io Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `join_channel` | Client &rarr; Server | `{ username: string, channel: string }` | Joins a room, announces arrival, and registers active presence in Redis. |
| `send_message` | Client &rarr; Server | `{ message: string }` | Sends a message to everyone currently in the user's active channel. |
| `leave_channel` | Client &rarr; Server | None | Leaves current channel, clears presence from Redis, and notifies room. |
| `channel_joined` | Server &rarr; Client | `{ channel: string, username: string }` | Confirms successful subscription to the requested channel. |
| `receive_message` | Server &rarr; Client | `{ id: string, username: string, channel: string, message: string, timestamp: string }` | Delivers real-time message to all subscribers in the channel. |
| `channel_users` | Server &rarr; Client | `Array<{ socketId: string, username: string, joinedAt: string }>` | Broadcasts updated member presence list whenever channel membership changes. |
| `system_message` | Server &rarr; Client | `{ message: string, timestamp: string }` | Notifies channel members of join, leave, and disconnect events. |
| `error_message` | Server &rarr; Client | `{ message: string }` | Sends validation or state errors directly to the sender. |

## REST Endpoints

| Method | Endpoint | Description | Sample Response |
|---|---|---|---|
| `GET` | `/health` | Service status and Redis ping | `{ "status": "OK", "redis": "PONG" }` |
| `GET` | `/api/channels` | Available chat channels list | `{ "success": true, "channels": ["general", "backend", "devops", "random"] }` |
| `GET` | `/api/channels/:channel/users` | Active users in channel queried from Redis | `{ "success": true, "channel": "general", "count": 1, "users": [...] }` |

## Transaction Logging

State transitions and messages (`JOIN_CHANNEL`, `MESSAGE_SENT`, `LEAVE_CHANNEL`, `DISCONNECT`) are written asynchronously as single-line JSON records to `logs/transactions.log`.
