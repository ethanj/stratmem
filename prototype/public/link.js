/**
 * WebRTC peer link plus deterministic low-bandwidth shaping.
 *
 * Signaling is server-assisted. Payload transfer is peer-to-peer via DataChannel
 * once connected, with a byte-budget delay applied before send.
 */
export class PeerLink extends EventTarget {
  constructor({ room, role }) {
    super();
    this.room = room;
    this.role = role;
    this.clientId = crypto.randomUUID();
    this.lastSignalId = 0;
    this.channel = null;
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.pollTimer = null;
    this.bandwidthKbps = 3;
    this.jitterMs = 150;
  }

  async connect() {
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.sendSignal("candidate", candidate);
      }
    };

    if (this.role === "sender") {
      this.channel = this.pc.createDataChannel("tacnet-metadata", { ordered: true });
      this.attachChannel(this.channel);
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.sendSignal("offer", offer);
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
    const params = new URLSearchParams({ room: this.room, since: String(this.lastSignalId) });
    const response = await fetch(`/api/signal?${params.toString()}`);
    const { messages } = await response.json();
    for (const message of messages) {
      this.lastSignalId = Math.max(this.lastSignalId, message.id);
      if (message.sender_id === this.clientId) continue;
      await this.handleSignal(message);
    }
  }

  async handleSignal(message) {
    if (message.kind === "offer" && this.role === "receiver") {
      await this.pc.setRemoteDescription(message.payload);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      await this.sendSignal("answer", answer);
    }
    if (message.kind === "answer" && this.role === "sender") {
      await this.pc.setRemoteDescription(message.payload);
    }
    if (message.kind === "candidate" && message.payload) {
      await this.pc.addIceCandidate(message.payload);
    }
  }

  async sendSignal(kind, payload) {
    await fetch(`/api/signal?room=${encodeURIComponent(this.room)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sender_id: this.clientId, kind, payload }),
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
