import "dotenv/config";
import { validateEnv } from "./config/env.js";

// Fail fast on missing or unsafe configuration, before anything else loads
validateEnv();

const { default: app } = await import("./app.js");
const { default: connectDB } = await import("./config/db.js");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`EduBatch API running on port ${PORT}`);
  });
};

startServer();
