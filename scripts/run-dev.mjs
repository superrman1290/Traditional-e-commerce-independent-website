import { spawn } from "node:child_process";
import { join } from "node:path";

const targets = [
  ["storefront", "apps/storefront"],
  ["admin", "apps/admin"],
  ["api", "apps/api"]
];

const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const commandArgs = npmCli ? [npmCli, "run", "dev"] : ["run", "dev"];
const root = process.cwd();
const children = targets.map(([name, cwd]) => {
  const child = spawn(command, commandArgs, {
    cwd: join(root, cwd),
    env: process.env,
    stdio: "pipe"
  });

  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });

  return child;
});

const stop = () => {
  for (const child of children) {
    child.kill("SIGTERM");
  }
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
