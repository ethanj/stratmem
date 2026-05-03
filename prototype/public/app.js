/**
 * TacNet voice metadata prototype controller.
 *
 * Coordinates STT, deterministic metadata extraction, CBOR encoding, shaped
 * WebRTC transport, receiver decode, S2 rendering, TTS, and live metrics.
 */
import { decodeFrame, encodeFrame, fnv1a, toHex } from "./codec.js?v=peer-diagnostics-20260503";
import { compactMetadata, expandMetadata, extractMetadata, reconstructText, samples, validateMetadata } from "./metadata.js?v=free-text-fallback-20260503";
import { createId } from "./ids.js?v=uuid-fallback-20260503";
import { PeerLink } from "./link.js?v=uuid-fallback-20260503";
import { OfflineWhisperTranscriber } from "./stt.js?v=peer-diagnostics-20260503";

const frameTypes = {
  metadata: 1,
  deviceDead: 2,
};

const clientId = createId();

const state = {
  peer: null,
  stt: null,
  sequence: 0,
  transcript: "",
  lastMetadata: null,
  lastSummary: "",
  events: [],
  startedAt: 0,
};

const ui = Object.fromEntries(
  [
    "serverStatus", "peerStatus", "sttStatus", "roleSelect", "roomInput",
    "connectPeer", "connectStt", "bandwidthInput", "bandwidthLabel",
    "jitterInput", "jitterLabel", "talkButton", "manualTranscript",
    "sendTranscript", "transcriptView", "metadataView", "binaryView",
    "metricsView", "timelineView", "receiverMetadata", "receiverSummary",
    "speakLast", "killSwitch", "deviceStatus",
  ].map((id) => [id, document.getElementById(id)]),
);

bootstrap();

async function bootstrap() {
  await checkServer();
  bindControls();
  updateRole();
  updateLinkLabels();
  renderMetrics();
  logClient("client_boot", { href: window.location.href, userAgent: navigator.userAgent });
}

async function checkServer() {
  try {
    const response = await fetch("/api/health");
    ui.serverStatus.textContent = response.ok ? "Server: online" : "Server: error";
  } catch {
    ui.serverStatus.textContent = "Server: offline";
  }
}

function bindControls() {
  ui.roleSelect.addEventListener("change", () => {
    updateRole();
    logClient("role_change", { role: ui.roleSelect.value });
  });
  ui.bandwidthInput.addEventListener("input", () => {
    updateLinkLabels();
    logClient("bandwidth_change", { kbps: ui.bandwidthInput.value });
  });
  ui.jitterInput.addEventListener("input", () => {
    updateLinkLabels();
    logClient("jitter_change", { ms: ui.jitterInput.value });
  });
  ui.connectPeer.addEventListener("click", connectPeer);
  ui.connectStt.addEventListener("click", connectStt);
  ui.sendTranscript.addEventListener("click", () => {
    logClient("manual_send_click", { bytes: ui.manualTranscript.value.length });
    processTranscript(ui.manualTranscript.value);
  });
  ui.killSwitch.addEventListener("click", sendKillSwitch);
  ui.speakLast.addEventListener("click", () => speak(state.lastSummary));
  ui.talkButton.addEventListener("pointerdown", startTalk);
  ui.talkButton.addEventListener("pointerup", stopTalk);
  ui.talkButton.addEventListener("pointerleave", stopTalk);
  document.querySelectorAll("[data-sample]").forEach((button) => {
    button.addEventListener("click", () => {
      ui.manualTranscript.value = samples[button.dataset.sample];
      logClient("sample_click", { sample: button.dataset.sample });
      processTranscript(ui.manualTranscript.value);
    });
  });
}

function updateRole() {
  const isSender = ui.roleSelect.value === "sender";
  document.querySelectorAll(".sender-only").forEach((node) => {
    node.style.display = isSender ? "" : "none";
  });
  document.querySelectorAll(".receiver-only").forEach((node) => {
    node.style.display = isSender ? "none" : "";
  });
}

function updateLinkLabels() {
  ui.bandwidthLabel.textContent = `${Number(ui.bandwidthInput.value).toFixed(1)} Kbps`;
  ui.jitterLabel.textContent = `${ui.jitterInput.value} ms`;
  state.peer?.setLinkBudget({
    bandwidthKbps: Number(ui.bandwidthInput.value),
    jitterMs: Number(ui.jitterInput.value),
  });
}

async function connectPeer() {
  state.peer?.close();
  state.peer = new PeerLink({
    room: ui.roomInput.value.trim() || "default",
    role: ui.roleSelect.value,
  });
  updateLinkLabels();
  wirePeer(state.peer);
  logClient("connect_peer_click", { role: ui.roleSelect.value, room: ui.roomInput.value.trim() || "default" });
  ui.peerStatus.textContent = "Peer: connecting";
  try {
    await state.peer.connect();
  } catch (error) {
    ui.peerStatus.textContent = "Peer: error";
    addEvent(`Peer error: ${error.message}`);
  }
}

function wirePeer(peer) {
  peer.addEventListener("open", () => {
    ui.peerStatus.textContent = "Peer: connected";
    addEvent("Peer data channel opened");
  });
  peer.addEventListener("queued", ({ detail }) => {
    addEvent(`Queued ${detail.bytes} bytes for ${Math.round(detail.delayMs)} ms`);
    renderMetrics(detail);
  });
  peer.addEventListener("sent", ({ detail }) => {
    addEvent(`Sent ${detail.bytes} bytes`);
  });
  peer.addEventListener("message", ({ detail }) => {
    logClient("peer_message", { bytes: detail.bytes.length });
    receiveFrame(detail.bytes, detail.receivedAt);
  });
  peer.addEventListener("closed", () => {
    ui.peerStatus.textContent = "Peer: closed";
  });
  peer.addEventListener("signal", ({ detail }) => {
    addEvent(`Signal: ${detail.message}`);
  });
  peer.addEventListener("state", ({ detail }) => {
    const stateLabel = `${detail.connectionState}/${detail.iceConnectionState}`;
    ui.peerStatus.textContent = `Peer: ${stateLabel}`;
    addEvent(`Peer state: ${stateLabel}`);
  });
  peer.addEventListener("error", ({ detail }) => {
    ui.peerStatus.textContent = "Peer: error";
    addEvent(`Peer error: ${detail.message}`);
  });
}

async function connectStt() {
  state.stt?.close();
  state.stt = new OfflineWhisperTranscriber();
  wireStt(state.stt);
  logClient("connect_stt_click", {});
  ui.sttStatus.textContent = "STT: opening mic";
  try {
    await state.stt.connect();
  } catch (error) {
    ui.sttStatus.textContent = "STT: manual fallback";
    addEvent(`Local STT unavailable: ${error.message}`);
  }
}

function wireStt(stt) {
  let partial = "";
  stt.addEventListener("ready", () => {
    ui.sttStatus.textContent = "STT: ready";
  });
  stt.addEventListener("speech_started", () => addEvent("Speech started"));
  stt.addEventListener("speech_stopped", () => {
    ui.sttStatus.textContent = "STT: transcribing";
    addEvent("Speech stopped");
  });
  stt.addEventListener("transcribing", ({ detail }) => {
    addEvent(`Queued ${detail.bytes} local audio bytes for whisper.cpp`);
  });
  stt.addEventListener("delta", ({ detail }) => {
    partial += detail.text;
    state.transcript = partial;
    ui.transcriptView.textContent = partial;
  });
  stt.addEventListener("completed", ({ detail }) => {
    partial = "";
    ui.sttStatus.textContent = `STT: complete ${detail.elapsedMs ?? "--"} ms`;
    processTranscript(detail.text);
  });
  stt.addEventListener("error", ({ detail }) => {
    ui.sttStatus.textContent = "STT: error";
    addEvent(`STT error: ${detail.message}`);
  });
}

function startTalk() {
  logClient("talk_start", {});
  if (!state.stt) {
    addEvent("Connect Offline STT before push-to-talk");
    return;
  }
  state.startedAt = performance.now();
  ui.talkButton.classList.add("recording");
  ui.talkButton.textContent = "Release to Send";
  try {
    state.stt.start();
  } catch (error) {
    ui.sttStatus.textContent = "STT: error";
    addEvent(`STT error: ${error.message}`);
  }
}

async function stopTalk() {
  logClient("talk_stop", {});
  ui.talkButton.classList.remove("recording");
  ui.talkButton.textContent = "Hold to Talk";
  try {
    await state.stt?.stop();
  } catch (error) {
    ui.sttStatus.textContent = "STT: error";
    addEvent(`STT error: ${error.message}`);
  }
}

async function processTranscript(transcript) {
  const clean = transcript.trim();
  if (!clean) return;
  const metadata = extractMetadata(clean);
  const validation = validateMetadata(metadata);
  state.transcript = clean;
  state.lastMetadata = metadata;
  ui.transcriptView.textContent = clean;
  ui.metadataView.textContent = JSON.stringify({ validation, metadata }, null, 2);
  logClient("metadata_extracted", { report_type: metadata.report_type, valid: validation.ok });
  addEvent("Mission metadata extracted");
  await sendMetadata(metadata);
}

async function sendMetadata(metadata) {
  const compact = compactMetadata(metadata);
  const checksum = fnv1a(JSON.stringify(compact));
  const frame = {
    0: 1,
    1: ++state.sequence,
    2: new Date().toISOString(),
    3: compact,
    4: checksum,
    5: frameTypes.metadata,
  };
  const bytes = encodeFrame(frame);
  ui.binaryView.textContent = `${bytes.length} bytes\n${toHex(bytes)}`;
  renderMetrics({ bytes: bytes.length, metadata });
  logClient("metadata_frame_built", { bytes: bytes.length, sequence: state.sequence });
  await transmitFrame(bytes, metadata);
}

async function sendKillSwitch() {
  const payload = {
    1: "device_dead",
    2: "sender",
    3: new Date().toISOString(),
    4: "Source device marked dead by operator.",
  };
  const checksum = fnv1a(JSON.stringify(payload));
  const frame = {
    0: 1,
    1: ++state.sequence,
    2: payload[3],
    4: checksum,
    5: frameTypes.deviceDead,
    6: payload,
  };
  const bytes = encodeFrame(frame);
  ui.metadataView.textContent = JSON.stringify({ control: "device_dead", payload }, null, 2);
  ui.binaryView.textContent = `${bytes.length} bytes\n${toHex(bytes)}`;
  renderMetrics({ bytes: bytes.length });
  logClient("kill_switch_built", { bytes: bytes.length, sequence: state.sequence });
  addEvent("Kill switch control frame built");
  await transmitFrame(bytes, payload);
}

async function transmitFrame(bytes, detail) {
  if (!state.peer) {
    addEvent("Peer not connected; frame stayed local");
    return;
  }
  try {
    await state.peer.sendFrame(bytes, detail);
  } catch (error) {
    addEvent(`Send failed: ${error.message}`);
  }
}

function receiveFrame(bytes, receivedAt) {
  const frame = decodeFrame(bytes);
  const frameType = frame[5] ?? frameTypes.metadata;
  if (frameType === frameTypes.deviceDead) {
    receiveKillSwitchFrame(frame, bytes, receivedAt);
    return;
  }
  const compact = frame[3];
  const checksum = frame[4];
  const verified = checksum === fnv1a(JSON.stringify(compact));
  const metadata = expandMetadata(compact);
  const summary = reconstructText(metadata);
  state.lastSummary = summary;
  ui.receiverMetadata.textContent = JSON.stringify({ verified, frame, metadata }, null, 2);
  ui.receiverSummary.textContent = summary;
  ui.deviceStatus.textContent = "Source device: alive";
  ui.deviceStatus.classList.remove("dead");
  addEvent(`Received ${bytes.length} bytes`);
  renderMetrics({ bytes: bytes.length, receivedAt });
}

function receiveKillSwitchFrame(frame, bytes, receivedAt) {
  const payload = frame[6] ?? {};
  const verified = frame[4] === fnv1a(JSON.stringify(payload));
  const summary = "SOURCE DEVICE DEAD. Treat sender as offline.";
  state.lastSummary = summary;
  ui.receiverMetadata.textContent = JSON.stringify({ verified, frame, payload }, null, 2);
  ui.receiverSummary.textContent = summary;
  ui.deviceStatus.textContent = "Source device: DEAD";
  ui.deviceStatus.classList.add("dead");
  addEvent(`Received kill switch ${bytes.length} bytes`);
  renderMetrics({ bytes: bytes.length, receivedAt });
}

function logClient(event, detail = {}) {
  const body = {
    event,
    detail,
    client_id: clientId,
    role: ui.roleSelect?.value ?? "unknown",
    room: ui.roomInput?.value ?? "",
    peer_status: ui.peerStatus?.textContent ?? "",
  };
  fetch("/api/client-log", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

function speak(text) {
  if (!text || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.15;
  utterance.pitch = 0.95;
  window.speechSynthesis.speak(utterance);
}

function renderMetrics(last = {}) {
  const transcriptBytes = new TextEncoder().encode(state.transcript).length;
  const jsonBytes = new TextEncoder().encode(JSON.stringify(state.lastMetadata ?? {})).length;
  const binaryBytes = last.bytes ?? 0;
  const audioEstimate = Math.ceil(10 * 6000 / 8);
  const budgetBytes = Math.floor((Number(ui.bandwidthInput.value) * 1000 * 10) / 8);
  const compression = binaryBytes > 0 ? (audioEstimate / binaryBytes).toFixed(1) : "--";
  ui.metricsView.innerHTML = [
    metric("Audio estimate", `${audioEstimate} B`, "10 sec at 6 kbit/s"),
    metric("Transcript", `${transcriptBytes} B`, "local only"),
    metric("Metadata JSON", `${jsonBytes} B`, "debug only"),
    metric("CBOR frame", `${binaryBytes} B`, `${compression}x smaller than audio`),
    metric("10 sec budget", `${budgetBytes} B`, `${ui.bandwidthInput.value} Kbps link`),
    metric("Jitter", `${ui.jitterInput.value} ms`, "randomized queue delay"),
  ].join("");
}

function metric(label, value, note) {
  return `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)} - ${escapeHtml(note)}</span></div>`;
}

function addEvent(text) {
  logClient("timeline", { text });
  state.events.unshift({ text, at: new Date().toLocaleTimeString() });
  state.events = state.events.slice(0, 8);
  ui.timelineView.innerHTML = state.events
    .map((event) => `<div class="event">${escapeHtml(event.at)} - ${escapeHtml(event.text)}</div>`)
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
