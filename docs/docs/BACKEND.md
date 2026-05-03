# 🧠 Sentinel Forge — Backend Execution Plan

## Objective

Build a **stateful, step-based decision engine** that processes events incrementally and produces a single, high-confidence incident.

This is the **core system** that powers the entire product.

---

## 🎯 Core Goal

Enable this progression:

1. Event arrives  
2. Signals update  
3. System correlates  
4. Incident appears  

---

## 🧱 Phase 1 — Stateful Pipeline (MANDATORY)

### Implement `process_step()`

This function processes **one event at a time** and updates system state.

```python
def process_step(adapter, state):
    event = adapter.fetch_next_event()

    if not event:
        return state

    # Add event
    state["events"].append(event)

    # Normalize
    normalized = normalize(state["events"])

    # Detect signals
    signals = detect(normalized)
    state["signals"] = signals

    # Correlate
    incident_type = correlate(signals)

    # Interpret (only once)
    if incident_type and not state["incident"]:
        state["incident"] = interpret(incident_type, signals)

    return state
````

---

## 🧠 State Model

System state must persist across API calls.

```python
state = {
    "events": [],
    "signals": {},
    "incident": None
}
```

---

## 🔌 Phase 2 — Adapter Layer

All adapters must return events in this format:

```json
{
  "type": "...",
  "source": "mock | defender | siem | sensor",
  "timestamp": "...",
  "metadata": {}
}
```

### Current

* MockAdapter (scenario-driven)

### Future

* DefenderAdapter (Microsoft Graph API)
* SIEMAdapter (Elastic / Splunk)

---

## 🎬 Phase 3 — Scenario Engine

Replace static signals with realistic event sequences.

```python
[
  {"type": "failed_login"},
  {"type": "failed_login"},
  {"type": "failed_login"},
  {"type": "successful_login"},
  {"type": "node_access", "node": "A"},
  {"type": "node_access", "node": "B"},
  {"type": "node_access", "node": "C"},
  {"type": "drone_activity"}
]
```

---

## 🔍 Phase 4 — Detection Rules

Implement signal extraction:

* failed_logins
* suspicious_login
* lateral_movement (derived from node_access patterns)
* drone_activity

Each rule should return:

```python
{
  "active": True/False,
  "evidence": [...],
  "source": "..."
}
```

---

## 🧠 Phase 5 — Fusion (Core Differentiator)

Combine signals into a coordinated threat.

```python
def correlate(signals):
    if all(signal["active"] for signal in signals.values()):
        return "COORDINATED_INTRUSION"
    return None
```

---

## 🧾 Phase 6 — Interpretation

Convert correlated signals into operator-ready output.

Must include:

* severity
* confidence
* summary
* narrative
* explanation ("why")
* recommended actions

---

## 🌐 Phase 7 — API Layer

### Required Endpoints

POST `/simulate/start`
→ Reset state and initialize scenario

POST `/simulate/step`
→ Process next event

GET `/state`
→ Return current state

POST `/reset`
→ Clear all state

---

## 🔁 Phase 8 — State Management

State must:

* persist between requests
* update incrementally
* reflect real-time system progression

---

## 🔥 Success Criteria

Backend is complete when:

* events progress one step at a time
* signals update dynamically
* incident appears only at the correct moment
* state persists across API calls
* system can be driven entirely via API

---

## ⚠️ Do NOT Build

* database
* authentication
* real integrations (yet)
* unnecessary endpoints

---

## 🏁 Final Goal

Produce a backend system that:

> Converts a stream of cyber and physical events into a clear, actionable decision in real time

```

---




