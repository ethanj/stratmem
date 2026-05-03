// services/api.ts
import { buildDegradedComms, ravenGapCommsFull } from "./ravenGapStub";
import type { ReceiverDecodeEvent } from "../types/ravenGap";

const BASE_URL = "http://localhost:8000";
const DEFAULT_VOICE_AUDIO_ID = "raven_gap_nine_line_1";

export async function getScenarios() {
  const res = await fetch(`${BASE_URL}/scenarios`);

  if (!res.ok) {
    throw new Error("Failed to fetch scenarios");
  }

  return res.json();
}

export async function selectScenario(scenarioId: string) {
  const res = await fetch(`${BASE_URL}/scenario/select`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      scenario_id: scenarioId,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to select scenario");
  }

  return res.json();
}

export async function startSimulation() {
  const res = await fetch(`${BASE_URL}/simulate/start`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error("Failed to start simulation");
  }

  return res.json();
}

export async function stepSimulation() {
  const res = await fetch(`${BASE_URL}/simulate/step`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error("Failed to step simulation");
  }

  return res.json();
}

export async function getState() {
  const res = await fetch(`${BASE_URL}/state`);

  if (!res.ok) {
    throw new Error("Failed to fetch state");
  }

  return res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${BASE_URL}/reset`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error("Failed to reset simulation");
  }

  return res.json();
}

export async function analyzeIncident(payload: {
  correlation: unknown;
  incident: unknown;
}) {
  const res = await fetch(`${BASE_URL}/agent/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to analyze incident");
  }

  return res.json();
}

export async function updateIncidentAction(payload: {
  incident_id: string;
  action: string;
  completed: boolean;
  note?: string;
}) {
  const res = await fetch(`${BASE_URL}/incident/action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to update incident action");
  }

  return res.json();
}


export async function resolveIncident(payload: { incident_id: string; }) {
  const res = await fetch(`${BASE_URL}/incident/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to resolve incident");
  return res.json();
}

/**
 * POST /comms/degrade. Per docs/THEPLAN.md, backend (Team A) ships only
 * `{ degraded, source_detail_level }`; the bandwidth meter computes raw /
 * compacted / budget locally in DegradedCommsToggle. Falls back to a local
 * comms slice when the endpoint isn't live yet.
 */
export async function setCompressionEnabled(enabled: boolean) {
  const res = await fetch(`${BASE_URL}/compression/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });

  if (!res.ok) {
    throw new Error("Failed to toggle compression");
  }

  return res.json();
}

export async function submitVoiceReport(audio_id = DEFAULT_VOICE_AUDIO_ID) {
  const res = await fetch(`${BASE_URL}/voice/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio_id }),
  });

  if (!res.ok) {
    throw new Error("Failed to submit voice report");
  }

  return res.json();
}

export async function decodeReceiverDemoFrame(): Promise<ReceiverDecodeEvent> {
  const res = await fetch(`${BASE_URL}/api/receiver/decode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      use_fixture: true,
      room: "raven-gap",
      source: "s2-dashboard",
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to decode receiver frame");
  }

  return res.json();
}

export async function setCommsDegraded(degraded: boolean, kbps?: number) {
  try {
    const res = await fetch(`${BASE_URL}/comms/degrade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        degraded,
        ...(kbps === undefined ? {} : { kbps }),
      }),
    });

    if (res.ok) {
      return res.json();
    }
  } catch {
    // network / endpoint missing — fall through to local stub
  }

  return {
    comms: degraded ? buildDegradedComms() : ravenGapCommsFull,
  };
}
