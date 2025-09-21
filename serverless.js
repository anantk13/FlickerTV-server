import { app } from "./src/app.js";  // <- notice we destructure app
import serverless from "serverless-http";

export const handler = serverless(app);
