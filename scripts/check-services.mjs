import net from "node:net";

const services = [
  ["Web", process.env.WEB_URL ?? "http://127.0.0.1:4173"],
  ["Java BI Core", process.env.JAVA_CORE_URL ?? "http://127.0.0.1:8080"],
  ["Python Agent", process.env.AGENT_URL ?? "http://127.0.0.1:8000"],
];

async function waitForHttp(name, url) {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${url}/health`);
      const body = await response.json();
      if (!response.ok || body.status !== "UP") throw new Error(`HTTP ${response.status}`);
      console.log(`✓ ${name}: UP (${url}/health)`);
      return true;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  console.error(`✗ ${name}: DOWN (${url}/health)`, lastError instanceof Error ? lastError.message : lastError);
  return false;
}

function waitForTcp(name, host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.once("connect", () => {
      socket.destroy();
      console.log(`✓ ${name}: UP (${host}:${port})`);
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

const results = await Promise.all(services.map(([name, url]) => waitForHttp(name, url)));
let postgresReady = await waitForTcp("PostgreSQL", "127.0.0.1", 5432);
for (let attempt = 0; !postgresReady && attempt < 29; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  postgresReady = await waitForTcp("PostgreSQL", "127.0.0.1", 5432);
}

if (![...results, postgresReady].every(Boolean)) process.exitCode = 1;
