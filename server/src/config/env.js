
const isProd = () => process.env.NODE_ENV === "production";

const ALWAYS_REQUIRED = ["MONGO_URI", "JWT_SECRET"];
const PRODUCTION_REQUIRED = ["CLIENT_URL", "APP_URL", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"];

export const validateEnv = () => {
  const required = isProd() ? [...ALWAYS_REQUIRED, ...PRODUCTION_REQUIRED] : ALWAYS_REQUIRED;
  const missing = required.filter((key) => !process.env[key]?.trim());
  const problems = [];

  if (missing.length) problems.push(`Missing required environment variables: ${missing.join(", ")}`);

  if (isProd()) {
    if ((process.env.JWT_SECRET || "").length < 32) {
      problems.push("JWT_SECRET must be at least 32 characters in production.");
    }
    const origins = (process.env.CLIENT_URL || "").split(",").map((o) => o.trim());
    if (origins.some((o) => o === "*" || o.startsWith("http://localhost"))) {
      problems.push("CLIENT_URL must list your deployed frontend origin(s), not * or localhost, in production.");
    }
    if ((process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_live_") && process.env.ALLOW_LIVE_PAYMENTS !== "true") {
      problems.push("Live Razorpay keys detected. Set ALLOW_LIVE_PAYMENTS=true if that is intentional.");
    }
  }

  if (problems.length) {
    problems.forEach((p) => console.error(`✗ ${p}`));
    process.exit(1);
  }

  // Non-fatal warnings
  if (!process.env.RAZORPAY_KEY_ID) console.warn("Razorpay keys not set: online fee payment is disabled.");
  else if (process.env.RAZORPAY_KEY_ID.startsWith("rzp_live_") && !isProd()) {
    console.warn("Razorpay LIVE keys in a non-production environment. Use rzp_test_ keys.");
  }
  if (!process.env.SMTP_HOST) {
    console.warn("SMTP_HOST not set: emails are written to the server log instead of being sent.");
  }
};

// Frontend base URL used in email links (reset password, login)
export const appUrl = () =>
  (process.env.APP_URL || (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0]).trim().replace(/\/+$/, "");

// Demo accounts that reviewers share: their passwords and status can't be changed in-app
export const isDemoProtected = (email = "") =>
  (process.env.DEMO_PROTECTED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(String(email).toLowerCase());
