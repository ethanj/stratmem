/**
 * Local two-browser peer test for the TacNet prototype.
 *
 * Launches two isolated headless Chrome instances through CDP, drives the
 * sender and receiver UI, verifies WebRTC DataChannel delivery, and writes
 * separate Markdown reports for sender and receiver under reports/.
 */
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const reportsDir = join(repoRoot, "reports");
const baseUrl = process.env.TACNET_URL ?? "http://localhost:8787";
const room = process.env.TACNET_TEST_ROOM ?? `local-peer-${Date.now().toString(36)}`;
const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const runStartedAt = new Date().toISOString();
const actions = [];

class CdpClient {
  constructor(name, wsUrl) {
    this.name = name;
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.console = [];
    this.socket = null;
  }

  async connect() {
    this.socket = new WebSocket(this.wsUrl);
    await new Promise((resolveConnect, rejectConnect) => {
      this.socket.addEventListener("open", resolveConnect, { once: true });
      this.socket.addEventListener("error", rejectConnect, { once: true });
    });
    this.socket.addEventListener("message", (event) => this.handleMessage(event.data));
    await this.send("Runtime.enable");
    await this.send("Page.enable");
    await this.send("Log.enable");
  }

  handleMessage(raw) {
    const message = JSON.parse(raw);
    if (message.id && this.pending.has(message.id)) {
      const { resolvePending, rejectPending } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) {
        rejectPending(new Error(message.error.message));
        return;
      }
      resolvePending(message.result);
      return;
    }
    if (message.method === "Runtime.consoleAPICalled") {
      this.console.push(formatConsoleEvent(message.params));
    }
    if (message.method === "Runtime.exceptionThrown") {
      this.console.push(`exception: ${message.params.exceptionDetails?.text ?? "runtime exception"}`);
    }
    if (message.method === "Log.entryAdded") {
      this.console.push(`${message.params.entry.level}: ${message.params.entry.text}`);
    }
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolvePending, rejectPending) => {
      this.pending.set(id, { resolvePending, rejectPending });
      this.socket.send(payload);
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text ?? "Runtime evaluation failed");
    }
    return result.result?.value;
  }

  close() {
    this.socket?.close();
  }
}

async function main() {
  await mkdir(reportsDir, { recursive: true });
  await resetRoom();
  const senderChrome = launchChrome("sender", 9331);
  const receiverChrome = launchChrome("receiver", 9332);
  let sender;
  let receiver;

  try {
    sender = await openClient("sender", 9331);
    receiver = await openClient("receiver", 9332);
    await prepareClient(receiver, "receiver");
    await prepareClient(sender, "sender");
    await clickConnect(receiver, "receiver");
    await wait(500);
    await clickConnect(sender, "sender");
    await waitForPeerOpen(sender, receiver);
    await sendSample(sender);
    await waitForSummary(receiver);
    await sendKillSwitch(sender);
    await waitForDeadStatus(receiver);
    await writeReports("PASS", sender, receiver, "");
  } catch (error) {
    await writeReports("FAIL", sender, receiver, error.message);
    throw error;
  } finally {
    sender?.close();
    receiver?.close();
    await stopChrome(senderChrome);
    await stopChrome(receiverChrome);
    await removeProfile("sender");
    await removeProfile("receiver");
  }
}

async function resetRoom() {
  actions.push(`Reset signaling room ${room}`);
  const response = await fetch(`${baseUrl}/api/signal?room=${encodeURIComponent(room)}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to reset signaling room: ${response.status}`);
  }
}

function launchChrome(name, port) {
  const profile = join(tmpdir(), `tacnet-${name}-profile`);
  const args = [
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--use-fake-ui-for-media-stream",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ];
  actions.push(`Launch ${name} Chrome on CDP port ${port}`);
  return spawn(chromePath, args, { stdio: "ignore" });
}

async function stopChrome(child) {
  if (!child || child.killed) {
    return;
  }
  const exited = new Promise((resolveExit) => {
    child.once("exit", resolveExit);
  });
  child.kill("SIGTERM");
  await Promise.race([exited, wait(2000)]);
  if (!child.killed) {
    child.kill("SIGKILL");
  }
}

async function removeProfile(name) {
  const profile = join(tmpdir(), `tacnet-${name}-profile`);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await rm(profile, { recursive: true, force: true });
      return;
    } catch {
      await wait(300);
    }
  }
}

async function openClient(name, port) {
  await waitForDebugger(port);
  const target = await createTarget(port, baseUrl);
  const client = new CdpClient(name, target.webSocketDebuggerUrl);
  await client.connect();
  await waitForReady(client);
  actions.push(`Opened ${name} client at ${baseUrl}`);
  return client;
}

async function waitForDebugger(port) {
  await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`).catch(() => null);
    return response?.ok;
  }, `Chrome debugger ${port}`);
}

async function createTarget(port, url) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Failed to create browser target for ${url}`);
  }
  return response.json();
}

async function waitForReady(client) {
  await waitFor(() => client.evaluate("document.readyState === 'complete' && Boolean(document.querySelector('#connectPeer'))"), `${client.name} ready`);
}

async function prepareClient(client, role) {
  await client.evaluate(`
    (() => {
      const roleSelect = document.querySelector("#roleSelect");
      const roomInput = document.querySelector("#roomInput");
      roleSelect.value = ${JSON.stringify(role)};
      roleSelect.dispatchEvent(new Event("change", { bubbles: true }));
      roomInput.value = ${JSON.stringify(room)};
      roomInput.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    })()
  `);
  actions.push(`Prepared ${role} client with room ${room}`);
}

async function clickConnect(client, role) {
  await client.evaluate('document.querySelector("#connectPeer").click()');
  actions.push(`${role} clicked Connect Peer`);
}

async function waitForPeerOpen(sender, receiver) {
  await waitFor(async () => {
    const senderStatus = await text(sender, "#peerStatus");
    const receiverStatus = await text(receiver, "#peerStatus");
    return senderStatus.includes("connected") && receiverStatus.includes("connected");
  }, "both peers connected", 20000);
  actions.push("Both peer DataChannels opened");
}

async function sendSample(sender) {
  await sender.evaluate('document.querySelector("[data-sample=\\"resupply\\"]").click()');
  actions.push("Sender sent sample resupply metadata frame");
}

async function waitForSummary(receiver) {
  await waitFor(async () => {
    const summary = await text(receiver, "#receiverSummary");
    return summary.includes("Alpha Two") && summary.includes("Request resupply");
  }, "receiver summary", 10000);
  actions.push("Receiver decoded sample metadata frame");
}

async function sendKillSwitch(sender) {
  await sender.evaluate('document.querySelector("#killSwitch").click()');
  actions.push("Sender sent kill switch control frame");
}

async function waitForDeadStatus(receiver) {
  await waitFor(async () => {
    const deviceStatus = await text(receiver, "#deviceStatus");
    return deviceStatus.includes("DEAD");
  }, "receiver dead status", 10000);
  actions.push("Receiver decoded kill switch control frame");
}

async function text(client, selector) {
  return client.evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? ""`);
}

async function collectReportData(client) {
  return client.evaluate(`
    (() => ({
      serverStatus: document.querySelector("#serverStatus")?.textContent ?? "",
      peerStatus: document.querySelector("#peerStatus")?.textContent ?? "",
      sttStatus: document.querySelector("#sttStatus")?.textContent ?? "",
      transcript: document.querySelector("#transcriptView")?.textContent ?? "",
      metadata: document.querySelector("#metadataView")?.textContent ?? "",
      binary: document.querySelector("#binaryView")?.textContent ?? "",
      receiverMetadata: document.querySelector("#receiverMetadata")?.textContent ?? "",
      receiverSummary: document.querySelector("#receiverSummary")?.textContent ?? "",
      deviceStatus: document.querySelector("#deviceStatus")?.textContent ?? "",
      timeline: [...document.querySelectorAll("#timelineView .event")].map((node) => node.textContent),
    }))()
  `);
}

async function writeReports(status, sender, receiver, errorMessage) {
  const senderData = sender ? await collectReportData(sender) : {};
  const receiverData = receiver ? await collectReportData(receiver) : {};
  await writeFile(join(reportsDir, "local-peer-sender.md"), renderReport("Sender", status, senderData, sender?.console ?? [], errorMessage));
  await writeFile(join(reportsDir, "local-peer-receiver.md"), renderReport("Receiver", status, receiverData, receiver?.console ?? [], errorMessage));
}

function renderReport(name, status, data, consoleLines, errorMessage) {
  return [
    `# Local Peer Test - ${name}`,
    "",
    `- Status: ${status}`,
    `- Started at: ${runStartedAt}`,
    `- Room: ${room}`,
    `- URL: ${baseUrl}`,
    `- Error: ${errorMessage || "none"}`,
    "",
    "## Actions",
    ...actions.map((action) => `- ${action}`),
    "",
    "## Final UI State",
    `- Server: ${data.serverStatus ?? ""}`,
    `- Peer: ${data.peerStatus ?? ""}`,
    `- STT: ${data.sttStatus ?? ""}`,
    `- Device: ${data.deviceStatus ?? ""}`,
    "",
    "## Transcript",
    fenced(data.transcript),
    "",
    "## Metadata",
    fenced(data.metadata),
    "",
    "## Binary",
    fenced(data.binary),
    "",
    "## Receiver Metadata",
    fenced(data.receiverMetadata),
    "",
    "## Receiver Summary",
    fenced(data.receiverSummary),
    "",
    "## Timeline",
    ...(data.timeline ?? []).map((line) => `- ${line}`),
    "",
    "## Console",
    ...(consoleLines.length > 0 ? consoleLines.map((line) => `- ${line}`) : ["- none"]),
    "",
  ].join("\n");
}

function fenced(value) {
  return ["```text", value ?? "", "```"].join("\n");
}

function formatConsoleEvent(params) {
  const args = params.args?.map((arg) => arg.value ?? arg.description ?? "").join(" ") ?? "";
  return `${params.type}: ${args}`;
}

async function waitFor(predicate, label, timeoutMs = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

await main();
