import serverless from "serverless-http";
import { createApp } from "../../packages/backend/src/app.js";

const app = createApp();
export const handler = serverless(app);
