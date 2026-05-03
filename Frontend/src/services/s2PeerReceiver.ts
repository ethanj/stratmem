/**
 * WebRTC receiver client embedded in the S2 dashboard.
 *
 * This mirrors the prototype sender's signaling contract so the dashboard can
 * receive compact CBOR frames directly. The sender still uses the `8787`
 * prototype page; the S2 UI owns the receiver role and posts decoded frames to
 * FastAPI through the normal receiver API.
 */
export type PeerReceiverStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "closed"
  | "error";

export type PeerReceiverConfig = {
  room: string;
  signalingUrl: string;
};

type ReceiverOptions = PeerReceiverConfig & {
  onFrame: (bytes: Uint8Array, receivedAt: number) => void;
  onStatus: (status: PeerReceiverStatus, detail?: string) => void;
};

type SignalMessage = {
  id: number;
  sender_id: string;
  session_id: string;
  kind: "offer" | "answer" | "candidate" | string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
};

export const DEFAULT_RECEIVER_ROOM = "0000";
export const DEFAULT_SIGNALING_URL = "http://localhost:8787";

export class S2PeerReceiver {
  private readonly clientId = createId();
  private readonly room: string;
  private readonly signalingUrl: string;
  private readonly onFrame: ReceiverOptions["onFrame"];
  private readonly onStatus: ReceiverOptions["onStatus"];
  private pc: RTCPeerConnection | null = null;
  private pollTimer: number | null = null;
  private sessionId = "";
  private lastSignalId = 0;
  private canSendCandidates = false;
  private localPendingCandidates: RTCIceCandidate[] = [];
  private remotePendingCandidates: RTCIceCandidateInit[] = [];

  constructor(options: ReceiverOptions) {
    this.room = options.room;
    this.signalingUrl = normalizeSignalingUrl(options.signalingUrl);
    this.onFrame = options.onFrame;
    this.onStatus = options.onStatus;
  }

  async connect(): Promise<void> {
    this.close();
    this.onStatus("connecting", this.room);
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.wirePeerConnection(this.pc);
    this.pollTimer = window.setInterval(() => {
      void this.pollSignals();
    }, 700);
    await this.pollSignals();
  }

  close(): void {
    if (this.pollTimer) window.clearInterval(this.pollTimer);
    this.pollTimer = null;
    this.canSendCandidates = false;
    this.localPendingCandidates = [];
    this.remotePendingCandidates = [];
    this.pc?.close();
    this.pc = null;
  }

  private wirePeerConnection(pc: RTCPeerConnection): void {
    pc.onconnectionstatechange = () => this.emitPeerState();
    pc.oniceconnectionstatechange = () => this.emitPeerState();
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.queueLocalCandidate(candidate);
    };
    pc.ondatachannel = ({ channel }) => this.attachChannel(channel);
  }

  private attachChannel(channel: RTCDataChannel): void {
    channel.binaryType = "arraybuffer";
    channel.onopen = () => this.onStatus("connected", this.room);
    channel.onclose = () => this.onStatus("closed", this.room);
    channel.onerror = () => this.onStatus("error", "DataChannel error");
    channel.onmessage = (event) => {
      this.onFrame(new Uint8Array(event.data as ArrayBuffer), Date.now());
    };
  }

  private async pollSignals(): Promise<void> {
    try {
      const params = new URLSearchParams({
        room: this.room,
        since: String(this.lastSignalId),
      });
      const response = await fetch(`${this.signalingUrl}/api/signal?${params}`);
      if (!response.ok) throw new Error(`signal_http_${response.status}`);
      const body = await response.json() as { messages?: SignalMessage[] };
      await this.handleSignals(body.messages ?? []);
    } catch (error) {
      this.onStatus("error", errorMessage(error));
    }
  }

  private async handleSignals(messages: SignalMessage[]): Promise<void> {
    for (const message of messages) {
      this.lastSignalId = Math.max(this.lastSignalId, message.id);
      if (message.sender_id === this.clientId || this.isStaleSignal(message)) {
        continue;
      }
      await this.handleSignal(message);
    }
  }

  private async handleSignal(message: SignalMessage): Promise<void> {
    if (message.kind === "offer") {
      await this.acceptOffer(message);
      return;
    }
    if (message.kind === "candidate" && message.payload) {
      await this.addOrQueueRemoteCandidate(message.payload as RTCIceCandidateInit);
    }
  }

  private async acceptOffer(message: SignalMessage): Promise<void> {
    if (!this.pc || !message.payload) return;
    if (this.sessionId && message.session_id !== this.sessionId) {
      this.remotePendingCandidates = [];
    }
    this.sessionId = message.session_id;
    await this.pc.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
    await this.flushRemoteCandidates();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.sendSignal("answer", answer);
    this.canSendCandidates = true;
    await this.flushLocalCandidates();
  }

  private async sendSignal(
    kind: "answer" | "candidate",
    payload: RTCSessionDescriptionInit | RTCIceCandidate,
  ): Promise<void> {
    await fetch(`${this.signalingUrl}/api/signal?room=${encodeURIComponent(this.room)}`, {
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

  private queueLocalCandidate(candidate: RTCIceCandidate): void {
    if (!this.canSendCandidates) {
      this.localPendingCandidates = [...this.localPendingCandidates, candidate];
      return;
    }
    this.sendSignal("candidate", candidate).catch((error) => {
      this.onStatus("error", errorMessage(error));
    });
  }

  private async flushLocalCandidates(): Promise<void> {
    const candidates = this.localPendingCandidates;
    this.localPendingCandidates = [];
    for (const candidate of candidates) {
      await this.sendSignal("candidate", candidate);
    }
  }

  private async addOrQueueRemoteCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc?.remoteDescription) {
      this.remotePendingCandidates = [...this.remotePendingCandidates, candidate];
      return;
    }
    await this.pc.addIceCandidate(candidate);
  }

  private async flushRemoteCandidates(): Promise<void> {
    const candidates = this.remotePendingCandidates;
    this.remotePendingCandidates = [];
    for (const candidate of candidates) {
      await this.pc?.addIceCandidate(candidate);
    }
  }

  private isStaleSignal(message: SignalMessage): boolean {
    if (!this.sessionId) return message.kind !== "offer";
    if (message.kind === "offer") return false;
    return message.session_id !== this.sessionId;
  }

  private emitPeerState(): void {
    const state = this.pc?.connectionState;
    if (state === "connected") this.onStatus("connected", this.room);
    if (state === "failed" || state === "disconnected") {
      this.onStatus("error", state);
    }
  }
}

export function receiverConfigFromLocation(): PeerReceiverConfig {
  const params = new URLSearchParams(window.location.search);
  return {
    room: params.get("room")?.trim() || DEFAULT_RECEIVER_ROOM,
    signalingUrl: normalizeSignalingUrl(params.get("signal") || DEFAULT_SIGNALING_URL),
  };
}

function normalizeSignalingUrl(value: string): string {
  const text = value.trim().replace(/\/+$/, "");
  if (!text) return DEFAULT_SIGNALING_URL;
  const candidate = /^https?:\/\//i.test(text) ? text : `http://${text}`;
  try {
    return new URL(candidate).toString().replace(/\/+$/, "");
  } catch {
    return DEFAULT_SIGNALING_URL;
  }
}

function createId(): string {
  if ("randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "receiver_error";
}
