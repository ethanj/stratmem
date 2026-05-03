/**
 * WebRTC peer link plus deterministic low-bandwidth shaping.
 *
 * Signaling is server-assisted. Payload transfer is peer-to-peer via DataChannel
 * once connected, with a byte-budget delay applied before send.
 */
import { createId } from "./ids.js?v=uuid-fallback-20260503";

export class PeerLink extends EventTarget {
  constructor({ room, role }) {
    super();
    this.room = room;
    this.role = role;
    this.clientId = createId();
    this.sessionId = role === "sender" ? createId() : "";
    this.lastSignalId = 0;
    this.channel = null;
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.pollTimer = null;
    this.canSendCandidates = false;
    this.localPendingCandidates = [];
    this.remotePendingCandidates = [];
    this.bandwidthKbps = 3;
    this.jitterMs = 150;
  }

  async connect() {
    this.pc.onconnectionstatechange = () => this.emitPeerState();
    this.pc.oniceconnectionstatechange = () => this.emitPeerState();
    this.pc.onicegatheringstatechange = () => this.emitPeerState();
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.queueLocalCandidate(candidate);
      }
    };

    if (this.role === "sender") {
      await this.resetSignals();
      this.channel = this.pc.createDataChannel("tacnet-metadata", { ordered: true });
      this.attachChannel(this.channel);
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.sendSignal("offer", offer);
      this.emit("signal", { message: "Sent offer" });
      this.canSendCandidates = true;
      await this.flushLocalCandidates();
    } else {
      this.pc.ondatachannel = ({ channel }) => {
        this.channel = channel;
        this.attachChannel(channel);
      };
    }

    this.pollTimer = window.setInterval(() => this.pollSignals(), 700);
    await this.pollSignals();
  }

  setLinkBudget({ bandwidthKbps, jitterMs }) {
    this.bandwidthKbps = bandwidthKbps;
    this.jitterMs = jitterMs;
  }

  async sendFrame(frameBytes, metadata) {
    if (!this.channel || this.channel.readyState !== "open") {
      throw new Error("DataChannel is not open");
    }
    const now = performance.now();
    const txDelayMs = (frameBytes.length * 8) / Math.max(this.bandwidthKbps, 0.1);
    const jitter = Math.random() * this.jitterMs;
    const delayMs = txDelayMs + jitter;
    this.emit("queued", { bytes: frameBytes.length, txDelayMs, jitter, delayMs, metadata });
    await sleep(delayMs);
    this.channel.send(frameBytes);
    this.emit("sent", { bytes: frameBytes.length, delayMs, elapsedMs: performance.now() - now });
  }

  close() {
    if (this.pollTimer) window.clearInterval(this.pollTimer);
    this.localPendingCandidates = [];
    this.remotePendingCandidates = [];
    this.channel?.close();
    this.pc.close();
  }

  attachChannel(channel) {
    channel.binaryType = "arraybuffer";
    channel.onopen = () => this.emit("open", {});
    channel.onclose = () => this.emit("closed", {});
    channel.onerror = () => this.emit("error", { message: "DataChannel error" });
    channel.onmessage = (event) => {
      this.emit("message", { bytes: new Uint8Array(event.data), receivedAt: Date.now() });
    };
  }

  async pollSignals() {
    try {
      const params = new URLSearchParams({ room: this.room, since: String(this.lastSignalId) });
      const response = await fetch(`/api/signal?${params.toString()}`);
      const { messages } = await response.json();
      for (const message of messages) {
        this.lastSignalId = Math.max(this.lastSignalId, message.id);
        if (message.sender_id === this.clientId || this.isStaleSignal(message)) continue;
        await this.handleSignal(message);
      }
    } catch (error) {
      this.emit("error", { message: error.message || "Signal polling failed" });
    }
  }

  async handleSignal(message) {
    if (message.kind === "offer" && this.role === "receiver") {
      if (this.sessionId && message.session_id !== this.sessionId && this.pc.connectionState === "connected") return;
      if (this.sessionId && message.session_id !== this.sessionId) {
        this.remotePendingCandidates = [];
        this.emit("signal", { message: "Accepting replacement offer" });
      }
      this.sessionId = String(message.session_id ?? "");
      this.emit("signal", { message: "Received offer" });
      await this.pc.setRemoteDescription(message.payload);
      await this.flushRemoteCandidates();
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      await this.sendSignal("answer", answer);
      this.emit("signal", { message: "Sent answer" });
      this.canSendCandidates = true;
      await this.flushLocalCandidates();
    }
    if (message.kind === "answer" && this.role === "sender") {
      if (!this.isCurrentSession(message)) return;
      if (this.pc.signalingState !== "have-local-offer") {
        this.emit("signal", { message: "Ignored duplicate answer" });
        return;
      }
      this.emit("signal", { message: "Received answer" });
      await this.pc.setRemoteDescription(message.payload);
      await this.flushRemoteCandidates();
    }
    if (message.kind === "candidate" && message.payload) {
      if (!this.isCurrentSession(message)) return;
      await this.addOrQueueRemoteCandidate(message.payload);
    }
  }

  async sendSignal(kind, payload) {
    await fetch(`/api/signal?room=${encodeURIComponent(this.room)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sender_id: this.clientId,
        session_id: this.sessionId,
        kind,
        payload,
      }),
    });
  }

  async resetSignals() {
    await fetch(`/api/signal?room=${encodeURIComponent(this.room)}`, {
      method: "DELETE",
    });
  }

  queueLocalCandidate(candidate) {
    if (!this.canSendCandidates) {
      this.localPendingCandidates.push(candidate);
      return;
    }
    this.sendSignal("candidate", candidate).catch((error) => {
      this.emit("error", { message: error.message || "Failed to send ICE candidate" });
    });
  }

  async flushLocalCandidates() {
    const candidates = this.localPendingCandidates.splice(0);
    for (const candidate of candidates) {
      await this.sendSignal("candidate", candidate);
    }
  }

  async addOrQueueRemoteCandidate(candidate) {
    if (!this.pc.remoteDescription) {
      this.remotePendingCandidates.push(candidate);
      return;
    }
    await this.pc.addIceCandidate(candidate);
  }

  async flushRemoteCandidates() {
    const candidates = this.remotePendingCandidates.splice(0);
    for (const candidate of candidates) {
      await this.pc.addIceCandidate(candidate);
    }
  }

  isCurrentSession(message) {
    return Boolean(this.sessionId) && message.session_id === this.sessionId;
  }

  isStaleSignal(message) {
    if (this.role === "receiver" && !this.sessionId) {
      return message.kind !== "offer";
    }
    if (this.role === "receiver" && message.kind === "offer") {
      return false;
    }
    return !this.isCurrentSession(message);
  }

  emitPeerState() {
    this.emit("state", {
      connectionState: this.pc.connectionState,
      iceConnectionState: this.pc.iceConnectionState,
      iceGatheringState: this.pc.iceGatheringState,
      signalingState: this.pc.signalingState,
    });
  }

  emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
