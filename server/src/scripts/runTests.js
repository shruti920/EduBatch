// Runs every test script in order, stopping at the first failure.
// If MONGO_URI_TEST is set, the demo data is seeded into that database first,
// so tests never touch your main database. Works the same on Windows, macOS and Linux.
import "dotenv/config";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const run = (file, env = process.env) =>
  spawnSync(process.execPath, [path.join(dir, file)], { stdio: "inherit", env }).status === 0;

if (process.env.MONGO_URI_TEST) {
  console.log("Seeding the test database (MONGO_URI_TEST)…");
  const env = { ...process.env, MONGO_URI: process.env.MONGO_URI_TEST };
  for (const seed of ["seedUsers.js", "seedBatches.js", "seedEnrollments.js", "seedAttendance.js"]) {
    if (!run(seed, env)) process.exit(1);
  }
}

const suites = [
  "testAuth.js",
  "testRoleGuard.js",
  "testBatches.js",
  "testEnrollments.js",
  "testDashboard.js",
  "testAttendance.js",
  "testPayments.js",
  "testNotices.js",
];

for (const suite of suites) {
  console.log(`\n▶ ${suite}`);
  if (!run(suite)) {
    console.error(`\n${suite} failed.`);
    process.exit(1);
  }
}
console.log(`\nAll ${suites.length} test suites passed.`);
