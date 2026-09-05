import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { config } from "dotenv";

if (existsSync(".env.test")) {
  config({ path: ".env.test" });
}
config();

const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const allowUnsafe = process.env.ALLOW_UNSAFE_TEST_DB === "true";
const looksLikeTest =
  typeof testDatabaseUrl === "string" &&
  (/test/i.test(testDatabaseUrl) ||
    (testDatabaseUrl.startsWith("file:") &&
      (testDatabaseUrl.includes(":memory:") || /test/i.test(testDatabaseUrl))));

if (!testDatabaseUrl) {
  console.error("Missing test database URL. Set TEST_DATABASE_URL or .env.test.");
  process.exit(1);
}

if (!looksLikeTest && !allowUnsafe) {
  console.error(
    "Refusing to reset a non-test database. Set TEST_DATABASE_URL to a test DB or set ALLOW_UNSAFE_TEST_DB=true to override.",
  );
  process.exit(1);
}

process.env.DATABASE_URL = testDatabaseUrl;

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

// Build the test database from the real migration history, not from
// schema.prisma. `prisma db push` only syncs the declarative schema, so raw
// SQL in migrations — the append-only trigger on "AuditLog", and anything like
// it added later — would silently not exist in tests while existing in
// production. `migrate reset` drops, re-creates, and replays every migration,
// which is what production runs.
run("npx", [
  "prisma",
  "migrate",
  "reset",
  "--force",
  "--skip-generate",
  "--skip-seed",
]);
run("npx", ["vitest", "run"]);
