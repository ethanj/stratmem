# 🛡️ Sentinel Forge — Architecture

## Overview

Sentinel Forge is a **cyber-physical threat interpretation engine** that transforms fragmented signals into a single, actionable decision.

The system does not generate alerts—it **produces understanding**.

---

## Core Data Flow

Adapters → Ingestion → Normalization → Detection → Fusion → Interpretation → Incident → API → UI

---

## System Layers

### 🔌 Adapters (Data Sources)

Responsible for ingesting external data.

- Mock (scenario engine)
- Microsoft Defender (planned)
- SIEM (Elastic / Splunk planned)

All adapters output events into a unified format.

---

### 📥 Ingestion

Handles incoming raw data streams.

- Cyber signals (authentication logs, network activity)
- Physical signals (drone detection, perimeter sensors, access events)

---

### 🔄 Normalization

Transforms raw data into a consistent internal schema.

```json
{
  "type": "...",
  "source": "...",
  "timestamp": "...",
  "metadata": {}
}
````

---

### 🔍 Detection (Signal Extraction)

Extracts meaningful signals from normalized events.

**Examples:**

* failed_logins
* suspicious_login
* lateral_movement
* drone_activity

---

### 🧠 Fusion (Core Differentiator)

Combines signals across domains to identify coordinated behavior.

* Correlation logic
* Confidence scoring
* Multi-domain linking (cyber + physical)

---

### 🧾 Interpretation

Converts correlated signals into a clear, operator-ready output:

* Severity
* Confidence
* Explanation (“why”)
* Recommended actions

---

### 🔗 Pipeline

Orchestrates the full system flow:

1. Fetch event
2. Normalize
3. Detect signals
4. Correlate
5. Interpret
6. Output incident

---

### 🧠 State

Maintains system state across simulation steps.

```python
state = {
    "events": [],
    "signals": {},
    "incident": None
}
```

---

## Core Principle

> Sentinel Forge exists to collapse complexity into a single moment:
>
> * The system understands the situation
> * The operator knows exactly what to do

---

## Design Philosophy

* Pluggable data sources (adapter pattern)
* Clear separation of concerns
* Real-time decision support
* Explainable outputs (not black-box)

---

## Future Extensions

* Real Microsoft Defender + SIEM integrations
* Streaming ingestion (Kafka / event bus)
* Temporal correlation (time-based signal analysis)
* Spatial correlation (cyber + physical proximity)
* Operator feedback loop

```

