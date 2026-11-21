import crypto from "node:crypto";
import { Server, Socket } from "socket.io";
import {
  addUserToChannel,
  removeUserFromChannel,
  getChannelUsers,
} from "../services/presence.service";
import { logTransaction } from "../utils/fileLogger";

export function registerChatHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join_channel", async (data: { username?: string; channel?: string }) => {
      try {
        const username = data?.username?.trim();
        const channel = data?.channel?.trim();

        if (!username || !channel) {
          socket.emit("error_message", { message: "Username and channel are required" });
          return;
        }

        if (socket.data.channel) {
          const oldChannel = socket.data.channel;
          const prevUsername = socket.data.username || username;

          socket.leave(oldChannel);
          io.to(oldChannel).emit("system_message", {
            message: `${prevUsername} left #${oldChannel}`,
            timestamp: new Date().toISOString(),
          });

          await removeUserFromChannel(oldChannel, socket.id);
          const oldUsers = await getChannelUsers(oldChannel);
          io.to(oldChannel).emit("channel_users", oldUsers);

          await logTransaction("LEAVE_CHANNEL", {
            socketId: socket.id,
            username: prevUsername,
            channel: oldChannel,
          });
        }

        socket.join(channel);
        socket.data.username = username;
        socket.data.channel = channel;

        socket.emit("channel_joined", { channel, username });
        io.to(channel).emit("system_message", {
          message: `${username} joined #${channel}`,
          timestamp: new Date().toISOString(),
        });

        await addUserToChannel(channel, socket.id, username);
        const users = await getChannelUsers(channel);
        io.to(channel).emit("channel_users", users);

        await logTransaction("JOIN_CHANNEL", {
          socketId: socket.id,
          username,
          channel,
        });
      } catch (error) {
        socket.emit("error_message", { message: "Failed to join channel" });
      }
    });

    socket.on("send_message", async (data: { message?: string }) => {
      try {
        const trimmedMessage = data?.message?.trim();

        if (!socket.data.channel || !socket.data.username || !trimmedMessage) {
          socket.emit("error_message", {
            message: "Message must be non-empty and channel must be joined",
          });
          return;
        }

        const messageId = crypto.randomUUID();

        io.to(socket.data.channel).emit("receive_message", {
          id: messageId,
          username: socket.data.username,
          channel: socket.data.channel,
          message: trimmedMessage,
          timestamp: new Date().toISOString(),
        });

        await logTransaction("MESSAGE_SENT", {
          messageId,
          socketId: socket.id,
          username: socket.data.username,
          channel: socket.data.channel,
          message: trimmedMessage,
        });
      } catch (error) {
        console.error("Failed to send message:", (error as Error).message);
      }
    });

    socket.on("leave_channel", async () => {
      try {
        if (socket.data.channel) {
          const channel = socket.data.channel;
          const username = socket.data.username || "User";

          socket.leave(channel);
          io.to(channel).emit("system_message", {
            message: `${username} left #${channel}`,
            timestamp: new Date().toISOString(),
          });

          delete socket.data.channel;

          await removeUserFromChannel(channel, socket.id);
          const users = await getChannelUsers(channel);
          io.to(channel).emit("channel_users", users);

          await logTransaction("LEAVE_CHANNEL", {
            socketId: socket.id,
            username,
            channel,
          });
        }
      } catch (error) {
        console.error("Failed to leave channel:", (error as Error).message);
      }
    });

    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      try {
        if (socket.data.channel && socket.data.username) {
          const channel = socket.data.channel;
          const username = socket.data.username;

          io.to(channel).emit("system_message", {
            message: `${username} disconnected`,
            timestamp: new Date().toISOString(),
          });

          await removeUserFromChannel(channel, socket.id);
          const users = await getChannelUsers(channel);
          io.to(channel).emit("channel_users", users);

          await logTransaction("DISCONNECT", {
            socketId: socket.id,
            username,
            channel,
          });
        }
      } catch (error) {
        console.error("Failed to handle socket disconnect:", (error as Error).message);
      }
    });
  });
}
