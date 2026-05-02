// services/api.ts
const BASE_URL = "http://localhost:8000";

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
