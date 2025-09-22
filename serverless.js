import serverless from "serverless-http";
import app from "./src/app.js";

// export named handler for Vercel
export const handler = serverless(app);
