import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";

const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

const keyId = process.env.RAZORPAY_KEY_ID || "";
if (!keyId) {
  console.warn("Razorpay keys not set: online fee payment is disabled.");
} else if (keyId.startsWith("rzp_live_") && process.env.NODE_ENV !== "production") {
  console.warn("Razorpay LIVE keys in a non-production environment. Use rzp_test_ keys.");
}

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`EduBatch API running on port ${PORT}`);
  });
};

startServer();
