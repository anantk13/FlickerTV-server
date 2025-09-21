import serverless from "serverless-http";
import  app  from "./src/app.js"; // adjust path if app.js is in src folder

// export default handler for Vercel
export default serverless(app);
