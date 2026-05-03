/**
 * Receiver-to-S2 bridge for peer-delivered semantic frames.
 *
 * The peer prototype receives the compact CBOR bytes in-browser. This module
 * forwards those same bytes to the FastAPI receiver decode endpoint so the S2
 * dashboard can update readiness from a real peer frame instead of a manual
 * fixture click.
 */
const DEFAULT_ENDPOINT = "http://localhost:8000";
const STORAGE_KEY = "tacnet.s2.endpoint";

export function createS2Bridge({
  endpointInput,
  statusNode,
  roomInput,
  addEvent,
  logClient,
  toHex,
}) {
  const setStatus = (text) => {
    if (statusNode) statusNode.textContent = text;
  };

  const init = () => {
    if (!endpointInput) return;
    endpointInput.value = initialEndpoint();
    endpointInput.addEventListener("change", () => {
      const endpoint = normalizeEndpoint(endpointInput.value);
      endpointInput.value = endpoint || DEFAULT_ENDPOINT;
      persistEndpoint(endpointInput.value);
      setStatus("S2: endpoint set");
      logClient("s2_endpoint_change", { endpoint: endpointInput.value });
    });
    setStatus("S2: idle");
  };

  const notifyFrame = async (bytes, receivedAt) => {
    const endpoint = normalizeEndpoint(endpointInput?.value);
    if (!endpoint) {
      setStatus("S2: endpoint missing");
      addEvent("S2 trigger skipped: no backend endpoint");
      return null;
    }

    setStatus("S2: posting frame");
    const body = {
      frame_hex: toHex(bytes),
      room: roomInput?.value?.trim() || "raven-gap",
      source: "peer-receiver",
      received_at: receivedAtIso(receivedAt),
    };

    try {
      const event = await postDecodeFrame(endpoint, body);
      setStatus(`S2: triggered ${event.byte_count ?? bytes.length} B`);
      addEvent("S2 dashboard trigger sent");
      logClient("s2_trigger_sent", {
        endpoint,
        bytes: event.byte_count ?? bytes.length,
        frame_type: event.frame_type,
        verified: event.verified,
      });
      return event;
    } catch (error) {
      setStatus("S2: trigger failed");
      addEvent(`S2 trigger failed: ${error.message}`);
      logClient("s2_trigger_error", { endpoint, message: error.message });
      return null;
    }
  };

  return { init, notifyFrame };
}

async function postDecodeFrame(endpoint, body) {
  const response = await fetch(`${endpoint}/api/receiver/decode`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await responseError(response));
  }

  return response.json();
}

async function responseError(response) {
  try {
    const body = await response.json();
    return body.detail || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function initialEndpoint() {
  const queryEndpoint = new URLSearchParams(window.location.search).get("s2");
  return normalizeEndpoint(queryEndpoint)
    || normalizeEndpoint(readStoredEndpoint())
    || DEFAULT_ENDPOINT;
}

function normalizeEndpoint(value) {
  const text = String(value || "").trim().replace(/\/+$/, "");
  if (!text) return "";
  const candidate = /^https?:\/\//i.test(text) ? text : `http://${text}`;

  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function readStoredEndpoint() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return "";
  }
}

function persistEndpoint(endpoint) {
  try {
    window.localStorage.setItem(STORAGE_KEY, endpoint);
  } catch {
    // Non-critical: the receiver can still post during this session.
  }
}

function receivedAtIso(receivedAt) {
  if (typeof receivedAt === "number") return new Date(receivedAt).toISOString();
  if (receivedAt instanceof Date) return receivedAt.toISOString();
  return new Date().toISOString();
}
