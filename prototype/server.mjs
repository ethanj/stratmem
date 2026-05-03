/**
 * Minimal TacNet voice-to-metadata prototype server.
 *
 * Serves the browser app, provides room-based WebRTC signaling for two laptops,
 * proxies optional OpenAI Realtime SDP setup, and runs local whisper.cpp
 * transcription for the offline P0 path. This file intentionally avoids
 * third-party dependencies to keep the prototype easy to run inside the repo.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(rootDir, "public");
const logDir = join(rootDir, "..", "logs");
const liveLogPath = join(logDir, "live-events.jsonl");
const port = Number.parseInt(process.env.PORT ?? "8787", 10);
const bindHost = "0.0.0.0";
const rooms = new Map();
const maxJsonBytes = 64 * 1024;
const maxSdpBytes = 1024 * 1024;
const maxAudioBytes = 8 * 1024 * 1024;
const whisperTimeoutMs = Number.parseInt(process.env.WHISPER_TIMEOUT_MS ?? "30000", 10);
const defaultWhisperBin = join(rootDir, "..", "localdeps", "whisper.cpp", "build", "bin", "whisper-cli");
const defaultWhisperModel = join(rootDir, "..", "localdeps", "whisper.cpp", "models", "ggml-base.en.bin");
const whisperBin = process.env.WHISPER_CPP_BIN ?? defaultWhisperBin;
const whisperModelPath = process.env.WHISPER_MODEL_PATH ?? defaultWhisperModel;
const useWhisperGpu = process.env.WHISPER_USE_GPU === "1";

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

function jsonResponse(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(payload);
}

function textResponse(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
  });
  res.end(body);
}

async function readBody(req, maxBytes = maxJsonBytes) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) {
      throw httpError(413, "request_too_large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  const body = await readBody(req, maxJsonBytes);
  if (body.length === 0) {
    return {};
  }
  return JSON.parse(body.toString("utf8"));
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getRoom(roomId) {
  const key = roomId.trim().slice(0, 64);
  if (!rooms.has(key)) {
    rooms.set(key, { messages: [], nextId: 1 });
  }
  return rooms.get(key);
}

async function writeLiveLog(event) {
  await mkdir(logDir, { recursive: true });
  const line = JSON.stringify({ at: new Date().toISOString(), ...event });
  await appendFile(liveLogPath, `${line}\n`);
}

async function handleSignal(req, res, url) {
  const roomId = url.searchParams.get("room") ?? "default";
  const room = getRoom(roomId);

  if (req.method === "DELETE") {
    room.messages = [];
    await writeLiveLog({ source: "server", event: "signal_reset", room: roomId });
    jsonResponse(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST") {
    const message = await readJson(req);
    const entry = {
      id: room.nextId,
      created_at: Date.now(),
      sender_id: String(message.sender_id ?? ""),
      session_id: String(message.session_id ?? ""),
      kind: String(message.kind ?? ""),
      payload: message.payload ?? null,
    };
    room.nextId += 1;
    room.messages.push(entry);
    if (room.messages.length > 200) {
      room.messages.splice(0, room.messages.length - 200);
    }
    await writeLiveLog({
      source: "server",
      event: "signal_post",
      room: roomId,
      signal_id: entry.id,
      sender_id: entry.sender_id,
      session_id: entry.session_id,
      kind: entry.kind,
    });
    jsonResponse(res, 200, { ok: true, id: entry.id });
    return;
  }

  if (req.method === "GET") {
    const since = Number.parseInt(url.searchParams.get("since") ?? "0", 10);
    const messages = room.messages.filter((entry) => entry.id > since);
    if (messages.length > 0) {
      await writeLiveLog({ source: "server", event: "signal_poll", room: roomId, since, count: messages.length });
    }
    jsonResponse(res, 200, { messages });
    return;
  }

  jsonResponse(res, 405, { error: "method_not_allowed" });
}

function buildRealtimeSessionConfig() {
  return {
    type: "transcription",
    audio: {
      input: {
        transcription: {
          model: process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-transcribe",
          language: "en",
          prompt: "Expect short military radio reports: SALUTE, ACE, LACE, CASEVAC, resupply, UAS, sensor, grid, checkpoint.",
        },
        turn_detection: null,
        noise_reduction: { type: "near_field" },
      },
    },
    include: ["item.input_audio_transcription.logprobs"],
  };
}

async function handleRealtimeSdp(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    jsonResponse(res, 400, { error: "missing_openai_api_key" });
    return;
  }

  const sdp = (await readBody(req, maxSdpBytes)).toString("utf8");
  const form = new FormData();
  form.set("sdp", sdp);
  form.set("session", JSON.stringify(buildRealtimeSessionConfig()));

  const response = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const body = await response.text();
  if (!response.ok) {
    textResponse(res, response.status, body);
    return;
  }
  textResponse(res, 200, body, "application/sdp");
}

async function handleClientLog(req, res) {
  if (req.method !== "POST") {
    jsonResponse(res, 405, { error: "method_not_allowed" });
    return;
  }
  const entry = await readJson(req);
  await writeLiveLog({ source: "client", ...entry, remote: req.socket.remoteAddress });
  jsonResponse(res, 200, { ok: true });
}

async function handleLocalTranscribe(req, res) {
  if (req.method !== "POST") {
    jsonResponse(res, 405, { error: "method_not_allowed" });
    return;
  }
  if (!isLocalRequest(req)) {
    jsonResponse(res, 403, { error: "local_stt_requires_localhost" });
    return;
  }

  const audioBytes = await readBody(req, maxAudioBytes);
  if (audioBytes.length < 44) {
    jsonResponse(res, 400, { error: "invalid_audio" });
    return;
  }

  const startedAt = Date.now();
  const tempDir = await mkdtemp(join(tmpdir(), "tacnet-whisper-"));
  const audioPath = join(tempDir, "input.wav");

  try {
    await writeFile(audioPath, audioBytes);
    await writeLiveLog({ source: "server", event: "stt_start", bytes: audioBytes.length });
    const transcript = await transcribeWithWhisper(audioPath);
    await writeLiveLog({ source: "server", event: "stt_complete", elapsed_ms: Date.now() - startedAt });
    jsonResponse(res, 200, {
      transcript,
      elapsed_ms: Date.now() - startedAt,
      engine: "whisper.cpp",
      model: "base.en",
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function isLocalRequest(req) {
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
}

async function transcribeWithWhisper(audioPath) {
  const args = [
    "-m", whisperModelPath,
    "-f", audioPath,
    "-l", "en",
    "-nt",
    "-otxt",
    "-np",
  ];
  if (!useWhisperGpu) {
    args.push("-ng");
  }
  const result = await runProcess(whisperBin, args, whisperTimeoutMs);
  const outputText = await readOptionalFile(`${audioPath}.txt`);
  const transcript = cleanWhisperText(outputText || result.stdout);
  if (!transcript) {
    throw httpError(502, "empty_transcript");
  }
  return transcript;
}

function runProcess(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(httpError(504, "whisper_timeout"));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", () => {
      clearTimeout(timer);
      reject(httpError(503, "whisper_not_available"));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(httpError(502, "whisper_failed"));
    });
  });
}

async function readOptionalFile(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function cleanWhisperText(raw) {
  return raw
    .replace(/output_txt:.*$/ims, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\[[^\]]+\]/g, "").trim())
    .filter((line) => line && !/^(whisper_|ggml_|system_info|main:|sampling|processing)/i.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);
  if (!filePath.startsWith(publicDir)) {
    textResponse(res, 403, "Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    const contentType = mimeTypes.get(extname(filePath)) ?? "application/octet-stream";
    if (requested === "/index.html") {
      await writeLiveLog({
        source: "server",
        event: "page_load",
        remote: req.socket.remoteAddress,
        host: req.headers.host ?? "",
        user_agent: req.headers["user-agent"] ?? "",
      });
    }
    res.writeHead(200, { "content-type": contentType });
    res.end(file);
  } catch {
    textResponse(res, 404, "Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  try {
    if (url.pathname === "/api/signal") {
      await handleSignal(req, res, url);
      return;
    }
    if (url.pathname === "/api/local/transcribe") {
      await handleLocalTranscribe(req, res);
      return;
    }
    if (url.pathname === "/api/client-log") {
      await handleClientLog(req, res);
      return;
    }
    if (url.pathname === "/api/openai/realtime-sdp" && req.method === "POST") {
      await handleRealtimeSdp(req, res);
      return;
    }
    if (url.pathname === "/api/health") {
      jsonResponse(res, 200, { ok: true, stt: "local-whisper", bind: bindHost, port });
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    if (status >= 500) {
      console.error(error);
    }
    await writeLiveLog({ source: "server", event: "http_error", path: url.pathname, status, message: error.message });
    jsonResponse(res, status, { error: error.message || "server_error" });
  }
});

server.listen(port, bindHost, () => {
  writeLiveLog({ source: "server", event: "server_start", bind: bindHost, port }).catch(console.error);
  console.log(`TacNet prototype listening on ${bindHost}:${port}`);
  console.log(`Sender browser: http://localhost:${port}`);
  console.log(`Local STT: ${whisperBin}`);
  console.log(`Local model: ${whisperModelPath}`);
});
