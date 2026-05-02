# 🛡️ Sentinel Forge

Sentinel Forge is a **cyber-physical threat interpretation engine** that transforms fragmented signals into a single, actionable decision.

Modern operators are overwhelmed by disconnected alerts across cybersecurity systems and physical sensors. Sentinel Forge addresses this by **fusing multi-domain telemetry**, identifying coordinated threats, and delivering **clear, prioritized actions in real time**.

> This is not another alerting system.  
> This is a **decision layer**.

---

## 🎯 The Problem

Security environments today suffer from:

- Alert fatigue from fragmented systems  
- Lack of correlation between cyber and physical signals  
- Slow decision-making under pressure  
- High cognitive load on operators  

Most systems show you *everything*.

Very few systems tell you:
- **What is actually happening**
- **Why it matters**
- **What to do next**

---

## ⚔️ The Solution

Sentinel Forge:

- Ingests cyber and physical signals  
- Detects meaningful patterns  
- Correlates signals across domains  
- Produces a **single, high-confidence incident**  
- Recommends **immediate response actions**  

---

## 🎬 Demo Overview

Sentinel Forge demonstrates how weak signals evolve into a critical, actionable situation.

### Scenario

- Multiple failed login attempts  
- Successful login from unfamiliar source  
- Lateral movement across systems  
- Drone activity near perimeter  

### Output

```

CRITICAL — Coordinated Intrusion Attempt
Confidence: 91%

````

### Recommended Actions

- Lock affected accounts  
- Isolate compromised systems  
- Dispatch patrol to Sector B  
- Increase surveillance  

---

## 🧠 What Makes Sentinel Forge Different

Most systems generate alerts.

Sentinel Forge:

- Connects signals across **cyber and physical domains**
- Reduces alert fatigue by consolidating noise
- Provides **explainable reasoning** for every decision
- Delivers **clear, actionable guidance**

It answers:

- **What is happening?**  
- **Why is it happening?**  
- **What should I do?**

---

## 🔥 Core Principle

Sentinel Forge is built to collapse complexity into a single moment:

→ The system understands the situation  
→ The operator knows exactly what to do  

---

## 🧠 Architecture Overview

### Core Data Flow

Adapters → Ingestion → Normalization → Detection → Fusion → Interpretation → Incident → API → UI

---

### System Layers

#### 🔌 Adapters (Data Sources)

- Mock (scenario engine)
- Microsoft Defender (planned)
- SIEM (Elastic / Splunk planned)

---

#### 📥 Ingestion

Handles incoming data streams:

- Cyber signals (auth logs, network activity)
- Physical signals (drone, perimeter, access)

---

#### 🔄 Normalization

Standardizes events into a unified format:

```json
{
  "type": "...",
  "source": "...",
  "timestamp": "...",
  "metadata": {}
}
````

---

#### 🔍 Detection

Extracts signals from events:

* failed_logins
* suspicious_login
* lateral_movement
* drone_activity

---

#### 🧠 Fusion (Core Differentiator)

Combines signals to detect coordinated behavior:

* Cross-domain correlation
* Confidence scoring
* Temporal + contextual linking

---

#### 🧾 Interpretation

Outputs operator-ready intelligence:

* Severity
* Confidence
* Explanation (“why”)
* Recommended actions

---

#### 🔗 Pipeline

Orchestrates the system:

1. Fetch event
2. Normalize
3. Detect signals
4. Correlate
5. Interpret
6. Output incident

---

## 📁 Project Structure

```
sentinel-forge/
│
├── server/
├── client/
├── docs/
├── scripts/
├── .env.example
├── README.md
```

---

## ⚛️ Frontend Overview

```
client/src/
├── components/
│   ├── IncidentCard.tsx
│   ├── SignalBreakdown.tsx
│   ├── ActionList.tsx
│   ├── LogStream.tsx
│
├── pages/
│   ├── Dashboard.tsx
│
├── hooks/
│   ├── useSimulation.ts
│
├── services/
│   ├── api.ts
```

---

## 🧠 State Model

```python
state = {
    "events": [],
    "signals": {},
    "incident": None
}
```

---

## 🔌 Integration Strategy

Sentinel Forge uses a **pluggable adapter architecture**.

### Current

* Mock scenario engine

### Planned

* Microsoft Defender (Graph API)
* SIEM systems (Elastic / Splunk)

Adapters allow real-world integration without changing core logic.

---

## 🚀 Future Work

* Real-time streaming ingestion (Kafka / event bus)
* Temporal + spatial correlation
* Real SIEM + Defender integrations
* Operator feedback loop
* Deployment in production environments

---

## 🏁 Why This Matters

Sentinel Forge aligns with real-world defense and security needs:

* Faster decision-making under pressure
* Reduced cognitive load on operators
* Improved situational awareness
* Cross-domain intelligence fusion

---

## 🔥 Final Thought

> In high-stakes environments, more data is not the solution.
> **Clarity is.**

Sentinel Forge turns fragmented signals into clear defense.

```

---
