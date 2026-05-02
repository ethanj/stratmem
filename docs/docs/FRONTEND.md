# ⚛️ Sentinel Forge — Frontend Execution Plan

## Objective

Build a **clear, high-impact interface** that demonstrates:

→ Events → Signals → Incident

The UI must allow a user to instantly understand:
- what is happening  
- why it matters  
- what to do next  

---

## 🎯 Core Goal

Enable this interaction:

1. User starts simulation  
2. User steps through events  
3. Logs appear progressively  
4. Signals update in real time  
5. Incident appears (final moment)  

---

## 🧱 Phase 1 — Basic Layout

Create a single-page dashboard.

### Layout Sections

- Controls (Start / Step / Reset)
- Event Stream (left)
- Signals Panel (right)
- Incident Card (center or top)

---

## 🧩 Phase 2 — Core Components

### 1. LogStream

Displays incoming events.

**Requirements:**
- Scrollable list
- Shows newest events at top or bottom
- Updates every step

**Example:**
```

[Defender] Failed login (admin)
[Defender] Failed login (admin)
[Defender] Successful login (new IP)

```

---

### 2. SignalBreakdown

Displays system signals.

**Requirements:**
- Show signal name
- Show active/inactive state
- Update live

**Example:**

```

FAILED_LOGINS       ✅
SUSPICIOUS_LOGIN    ✅
LATERAL_MOVEMENT    ❌
DRONE_ACTIVITY      ❌

````

---

### 3. IncidentCard (MOST IMPORTANT)

This is the focal point of the entire UI.

**Must display:**

- Severity (color-coded)
- Confidence %
- Summary
- Explanation (WHY)
- Recommended actions

---

### 4. ActionList

Displays recommended actions from incident.

**Example:**
- Lock affected accounts
- Isolate compromised node
- Dispatch patrol
- Increase surveillance

---

## 🔁 Phase 3 — API Integration

Connect to backend endpoints:

- POST `/simulate/start`
- POST `/simulate/step`
- GET `/state`
- POST `/reset`

---

## 🧠 Phase 4 — State Management

Maintain frontend state:

```ts
{
  events: [],
  signals: {},
  incident: null
}
````

Update state after each API call.

---

## 🎬 Phase 5 — Demo Behavior (CRITICAL)

UI must visually show progression:

1. Logs begin appearing
2. Signals gradually activate
3. Pause (build tension)
4. 🔴 Incident appears

---

## 🎨 Phase 6 — Visual Priority

Order of attention:

1. **IncidentCard (dominant)**
2. Signals
3. Logs

---

## ⚠️ Do NOT Build

* multiple pages
* routing complexity
* authentication
* heavy styling
* animations (unless trivial)

---

## 🔥 Success Criteria

Frontend is complete when:

* Clicking “Step” updates system state
* Logs visibly stream
* Signals update dynamically
* Incident appears clearly and dramatically
* User understands situation in under 5 seconds

---

## 🏁 Final Goal

Create an interface where:

> A user immediately understands what is happening
> and what action should be taken

```

---
