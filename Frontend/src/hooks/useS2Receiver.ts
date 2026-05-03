/**
 * React bridge between the embedded S2 WebRTC receiver and FastAPI.
 *
 * The hook keeps the dashboard subscribed to the sender's room and forwards
 * each binary frame to `/api/receiver/decode`. The rest of the dashboard then
 * reacts through normal `/state` refreshes.
 */
import { useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { decodeReceiverFrame } from "../services/api";
import {
  receiverConfigFromLocation,
  S2PeerReceiver,
  type PeerReceiverStatus,
} from "../services/s2PeerReceiver";
import type { ReceiverDecodeEvent } from "../types/ravenGap";

type Options = {
  enabled: boolean;
  onDecoded: (event: ReceiverDecodeEvent) => Promise<void> | void;
};

type ReceiverState = {
  status: PeerReceiverStatus;
  detail: string;
  room: string;
  signalingUrl: string;
};

export function useS2Receiver({ enabled, onDecoded }: Options): ReceiverState {
  const [config] = useState(receiverConfigFromLocation);
  const [state, setState] = useState<ReceiverState>({
    status: "idle",
    detail: "waiting",
    room: config.room,
    signalingUrl: config.signalingUrl,
  });
  const onDecodedRef = useRef(onDecoded);

  useEffect(() => {
    onDecodedRef.current = onDecoded;
  }, [onDecoded]);

  useEffect(() => {
    if (!enabled) return undefined;
    let closed = false;
    const receiver = new S2PeerReceiver({
      ...config,
      onStatus: (status, detail) => {
        if (!closed) {
          setState({ status, detail: detail || config.room, ...config });
        }
      },
      onFrame: (bytes, receivedAt) => {
        void decodeFrame(bytes, receivedAt, config, onDecodedRef, setState);
      },
    });

    receiver.connect().catch((error) => {
      if (!closed) {
        setState({ status: "error", detail: errorMessage(error), ...config });
      }
    });

    return () => {
      closed = true;
      receiver.close();
    };
  }, [config, enabled]);

  return state;
}

async function decodeFrame(
  bytes: Uint8Array,
  receivedAt: number,
  config: { room: string; signalingUrl: string },
  onDecodedRef: MutableRefObject<Options["onDecoded"]>,
  setState: Dispatch<SetStateAction<ReceiverState>>,
): Promise<void> {
  try {
    setState({ status: "connected", detail: `received ${bytes.length} B`, ...config });
    const event = await decodeReceiverFrame({
      frame_hex: toHex(bytes),
      room: config.room,
      source: "embedded-s2-receiver",
      received_at: new Date(receivedAt).toISOString(),
    });
    setState({ status: "connected", detail: `decoded ${event.byte_count} B`, ...config });
    await onDecodedRef.current(event);
  } catch (error) {
    setState({ status: "error", detail: errorMessage(error), ...config });
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(" ");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "receiver_error";
}
