// Imported by every test*.js script. They create and delete real documents, so:
// 1. never run in production;
// 2. use MONGO_URI_TEST when it's set, keeping demo data out of test runs.
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run test scripts with NODE_ENV=production.");
  process.exit(1);
}

if (process.env.MONGO_URI_TEST) {
  process.env.MONGO_URI = process.env.MONGO_URI_TEST;
} else {
  console.warn("MONGO_URI_TEST is not set: tests will use MONGO_URI (your main database).");
}

// Tests never send real email: messages go to the in-memory outbox instead
process.env.EMAIL_TRANSPORT = "log";
process.env.EMAIL_LOG_QUIET = "true";
