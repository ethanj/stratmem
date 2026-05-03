/**
 * Frontend API client for the Sentinel Forge demo shell.
 *
 * The functions in this file are intentionally thin wrappers around the
 * backend-owned HTTP contract. Components and hooks call these helpers instead
 * of hand-rolling fetches, which keeps endpoint names, request bodies, and
 * response handling centralized as the Raven Gap v3 integration evolves.
 */
const BASE_URL = "http://localhost:8000";
const DEFAULT_VOICE_AUDIO_ID = "raven_gap_salute_1";

async function postJson(path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Failed to POST ${path}`);
  }

  return res.json();
}

export async function getScenarios() {
  const res = await fetch(`${BASE_URL}/scenarios`);

  if (!res.ok) {
    throw new Error("Failed to fetch scenarios");
  }

  return res.json();
}

export async function selectScenario(scenarioId: string) {
  return postJson("/scenario/select", {
    scenario_id: scenarioId,
  });
}

export async function startSimulation() {
  return postJson("/simulate/start");
}

export async function stepSimulation() {
  return postJson("/simulate/step");
}

export async function getState() {
  const res = await fetch(`${BASE_URL}/state`);

  if (!res.ok) {
    throw new Error("Failed to fetch state");
  }

  return res.json();
}

export async function resetSimulation() {
  return postJson("/reset");
}

export async function analyzeIncident(payload: {
  correlation: any;
  incident: any;
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

export async function setCompressionEnabled(enabled: boolean) {
  return postJson("/compression/toggle", { enabled });
}

export async function submitVoiceReport(audio_id = DEFAULT_VOICE_AUDIO_ID) {
  return postJson("/voice/report", { audio_id });
}

export async function setCommsDegraded(degraded: boolean, kbps?: number) {
  return postJson("/comms/degrade", {
    degraded,
    ...(kbps === undefined ? {} : { kbps }),
  });
}
