import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = 4300 + Math.floor(Math.random() * 500);
const baseUrl = `http://${host}:${port}`;
const startupTimeoutMs = 30000;
const pollIntervalMs = 400;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/robots.txt`);
      if (response.ok) return;
    } catch {
      // Server not ready yet.
    }
    await sleep(pollIntervalMs);
  }
  throw new Error(`Server did not become ready within ${startupTimeoutMs}ms`);
}

async function run() {
  const child = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: String(port), HOST: host, NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderrTail = "";
  child.stderr.on("data", (chunk) => {
    const text = String(chunk);
    stderrTail = `${stderrTail}${text}`.slice(-4000);
  });

  try {
    await waitForServer();

    const robotsRes = await fetch(`${baseUrl}/robots.txt`);
    if (!robotsRes.ok) {
      throw new Error(`/robots.txt returned ${robotsRes.status}`);
    }

    const healthRes = await fetch(`${baseUrl}/api/health`);
    if (![200, 500].includes(healthRes.status)) {
      throw new Error(`/api/health returned unexpected status ${healthRes.status}`);
    }

    let healthPayload = null;
    try {
      healthPayload = await healthRes.json();
    } catch {
      throw new Error("/api/health did not return JSON");
    }

    if (!healthPayload || typeof healthPayload.status !== "string") {
      throw new Error("/api/health JSON missing 'status'");
    }

    const readyRes = await fetch(`${baseUrl}/api/ready`);
    if (![200, 503].includes(readyRes.status)) {
      throw new Error(`/api/ready returned unexpected status ${readyRes.status}`);
    }
    let readyPayload = null;
    try {
      readyPayload = await readyRes.json();
    } catch {
      throw new Error("/api/ready did not return JSON");
    }
    if (!readyPayload || !["ready", "not_ready"].includes(readyPayload.status)) {
      throw new Error("/api/ready JSON missing valid 'status'");
    }

    console.log(
      `Deep smoke passed. /robots.txt=${robotsRes.status}, /api/health=${healthRes.status}, /api/ready=${readyRes.status}`
    );
  } finally {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      sleep(3000),
    ]);
    if (child.exitCode === null) {
      child.kill("SIGKILL");
    }
  }

  if (stderrTail.includes("Error: listen EADDRINUSE")) {
    throw new Error(`Selected port ${port} was already in use`);
  }
}

run().catch((error) => {
  console.error(`Deep smoke failed: ${error.message}`);
  process.exit(1);
});
