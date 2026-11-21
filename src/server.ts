import http from "node:http";
import path from "node:path";
import express, { Request, Response } from "express";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { redis } from "./config/redis";
import { registerChatHandlers } from "./sockets/chat.socket";
import { clearAllPresenceKeys, getChannelUsers } from "./services/presence.service";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/health", async (_req: Request, res: Response) => {
  try {
    const redisStatus = await redis.ping();
    res.status(200).json({ status: "OK", redis: redisStatus });
  } catch (error) {
    res.status(503).json({ status: "ERROR", redis: "UNAVAILABLE" });
  }
});

app.get("/api/channels", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    channels: ["general", "backend", "devops", "random"],
  });
});

app.get("/api/channels/:channel/users", async (req: Request, res: Response) => {
  try {
    const channel = req.params.channel as string;
    const users = await getChannelUsers(channel);
    res.status(200).json({
      success: true,
      channel,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
});

registerChatHandlers(io);

const PORT = process.env.PORT || 5001;

server.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  await clearAllPresenceKeys();
});

export { app, server, io };
