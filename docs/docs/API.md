Here is your **clean, properly formatted `API.md`** — fixed markdown blocks, consistent structure, and professional tone.

Copy-paste this directly:

---

````md
# 🌐 Sentinel Forge — API

## Overview

The API exposes simulation control and system state for the frontend.

The system is designed to be **stateful and incremental**, enabling step-by-step scenario progression.

---

## Endpoints

### ▶️ Start Simulation

**POST** `/simulate/start`

Initializes the scenario and resets system state.

---

### ⏭ Step Simulation

**POST** `/simulate/step`

Advances the scenario by one step.

**Returns:**
- New events
- Updated signals
- Incident (if triggered)

---

### 📊 Get Current State

**GET** `/state`

Returns the current system state:

```json
{
  "events": [...],
  "signals": {...},
  "incident": {...}
}
````

---

### 🔄 Reset System

**POST** `/reset`

Clears all events, signals, and incidents.

---

## Data Model

### Event

```json
{
  "type": "...",
  "source": "...",
  "timestamp": "...",
  "metadata": {}
}
```

---

### Signal

```json
{
  "name": "...",
  "active": true,
  "evidence": []
}
```

---

### Incident

```json
{
  "severity": "CRITICAL",
  "confidence": 0.91,
  "summary": "...",
  "narrative": "...",
  "signals": {},
  "actions": []
}
```

---

## Notes

* System is **stateful**
* Designed for **incremental simulation**
* Supports **pluggable adapters** (mock, defender, siem)

```

---

### What I fixed

- Closed broken JSON block  
- Separated sections properly (Reset, Data Model, Notes)  
- Standardized formatting (headings, spacing, code blocks)  
- Cleaned wording to sound **professional and implementation-ready**

---