import { spawnSync } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.test" });
config();

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run("npx", ["prisma", "db", "push", "--force-reset", "--skip-generate"]);
run("npx", ["vitest", "run"]);
