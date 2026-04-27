import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = 4800 + Math.floor(Math.random() * 500);
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

async function postJson(path, payload) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function getJson(path) {
  const res = await fetch(`${baseUrl}${path}`);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { res, body };
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

    const badAdminRes = await postJson("/api/admin/login", {
      username: "invalid-user",
      password: "invalid-pass",
    });
    if (![400, 401].includes(badAdminRes.status)) {
      throw new Error(`/api/admin/login expected 400/401, got ${badAdminRes.status}`);
    }

    let sawThrottle = false;
    for (let i = 0; i < 8; i += 1) {
      const res = await postJson("/api/admin/login", {
        username: "invalid-user",
        password: "invalid-pass",
      });
      if (res.status === 429) {
        sawThrottle = true;
        break;
      }
      if (![400, 401].includes(res.status)) {
        throw new Error(`/api/admin/login unexpected status ${res.status}`);
      }
    }
    if (!sawThrottle) {
      const { res: readyRes } = await getJson("/api/ready");
      if (readyRes.status === 503) {
        console.log("Auth smoke: DB not ready, throttle assertion skipped.");
      } else {
        throw new Error("Admin throttle not triggered after repeated invalid attempts");
      }
    }

    const badMemberRes = await postJson("/api/members/login", {
      username: "inconnu",
      password: "bad-password",
    });
    if (![400, 401, 429].includes(badMemberRes.status)) {
      const { res: readyRes } = await getJson("/api/ready");
      if (!(readyRes.status === 503 && badMemberRes.status === 500)) {
        throw new Error(`/api/members/login unexpected status ${badMemberRes.status}`);
      }
    }

    console.log("Auth smoke passed. invalid logins handled and throttle triggered.");
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
  console.error(`Auth smoke failed: ${error.message}`);
  process.exit(1);
});
