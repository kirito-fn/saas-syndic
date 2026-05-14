import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, "../../../../logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

type Level = "INFO" | "WARN" | "ERROR";

function formatEntry(level: Level, module: string, message: string): string {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  return `[${timestamp}] [${level}] (${module}) ${message}`;
}

function write(level: Level, module: string, message: string): void {
  const line = formatEntry(level, module, message);
  console.log(line);
  fs.appendFile(LOG_FILE, line + "\n", () => {});
}

export const logger = {
  info: (module: string, msg: string) => write("INFO", module, msg),
  warn: (module: string, msg: string) => write("WARN", module, msg),
  error: (module: string, msg: string) => write("ERROR", module, msg),
};
