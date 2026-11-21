import fs from "node:fs";
import path from "node:path";

const logsDir = path.resolve(process.cwd(), "logs");
const logFilePath = path.join(logsDir, "transactions.log");

export async function logTransaction(
  event: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await fs.promises.mkdir(logsDir, { recursive: true });
    const line = `[${new Date().toISOString()}] [${event}] ${JSON.stringify(details)}\n`;
    await fs.promises.appendFile(logFilePath, line, "utf8");
  } catch (error) {
    console.error("Failed to write transaction log:", (error as Error).message);
  }
}
