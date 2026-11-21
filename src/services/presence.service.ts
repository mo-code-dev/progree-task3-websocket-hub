import { redis } from "../config/redis";

export interface ChannelUser {
  socketId: string;
  username: string;
  joinedAt: string;
}

const getChannelKey = (channel: string): string => `channel:${channel}:users`;

export async function addUserToChannel(
  channel: string,
  socketId: string,
  username: string
): Promise<void> {
  const user: ChannelUser = {
    socketId,
    username,
    joinedAt: new Date().toISOString(),
  };
  await redis.hset(getChannelKey(channel), socketId, JSON.stringify(user));
}

export async function removeUserFromChannel(
  channel: string,
  socketId: string
): Promise<void> {
  await redis.hdel(getChannelKey(channel), socketId);
}

export async function getChannelUsers(channel: string): Promise<ChannelUser[]> {
  const values = await redis.hvals(getChannelKey(channel));
  const users: ChannelUser[] = [];
  for (const val of values) {
    try {
      users.push(JSON.parse(val) as ChannelUser);
    } catch {
      continue;
    }
  }
  return users;
}

export async function clearAllPresenceKeys(): Promise<void> {
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "channel:*:users", "COUNT", 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (error) {
    console.error("Failed to clear presence keys:", (error as Error).message);
  }
}
