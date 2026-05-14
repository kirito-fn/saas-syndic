import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";

const PORT = parseInt(process.env.PORT || "3001", 10);

const app = createApp();

const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  logger.info("server", `Backend démarré sur http://${HOST}:${PORT}`);
  console.log(`API: http://${HOST}:${PORT}/api`);
});
