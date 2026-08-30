import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

config();

const databaseUrl = process.env.DIRECT_URL;
if (!databaseUrl) {
  console.error("Missing DIRECT_URL.");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  console.error("DIRECT_URL is not a valid PostgreSQL URL.");
  process.exit(1);
}

if (!parsed.hostname.endsWith("pooler.supabase.com")) {
  console.error("Refusing to back up an unexpected database host.");
  process.exit(1);
}

const pgDump = "/opt/homebrew/opt/postgresql@17/bin/pg_dump";
const pgRestore = "/opt/homebrew/opt/postgresql@17/bin/pg_restore";
if (!existsSync(pgDump) || !existsSync(pgRestore)) {
  console.error("PostgreSQL 17 client tools are required.");
  process.exit(1);
}

const backupDir = path.resolve("backups");
mkdirSync(backupDir, { recursive: true, mode: 0o700 });
const timestamp = new Date().toISOString().replaceAll(":", "-");
const output = path.join(backupDir, `tenant-guard-${timestamp}.dump`);

const dump = spawnSync(
  pgDump,
  [
    "--format=custom",
    "--schema=public",
    "--no-owner",
    "--no-privileges",
    "--file",
    output,
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PGHOST: parsed.hostname,
      PGPORT: parsed.port || "5432",
      PGDATABASE: parsed.pathname.slice(1) || "postgres",
      PGUSER: decodeURIComponent(parsed.username),
      PGPASSWORD: decodeURIComponent(parsed.password),
    },
  },
);
if (dump.status !== 0) {
  process.exit(dump.status ?? 1);
}

const verify = spawnSync(pgRestore, ["--list", output], {
  stdio: ["ignore", "ignore", "inherit"],
});
if (verify.status !== 0) {
  console.error("Backup verification failed.");
  process.exit(verify.status ?? 1);
}

console.log(`Verified logical backup created at ${output}`);
