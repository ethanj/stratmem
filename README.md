# TacNet Edge

TacNet Edge is a browser-based command-and-control demo for degraded communications. It shows a fictional Raven Gap infantry-platoon scenario where raw field traffic is too large for a constrained link, while compact semantic metadata can still update the commander picture.

The current implementation is a FastAPI backend, a React/Vite S2 dashboard, and a browser sender prototype that transmits compact CBOR metadata over a WebRTC peer link. The live demo does not require iPhones, Bluetooth mesh, hosted LLM calls, or live cloud speech services.

## Demo Story

The pitch centers on one idea:

> Current command and control takes too long to turn reports into a usable picture, and low-bandwidth or jammed environments make that delay worse.

TacNet Edge demonstrates the counterfactual:

1. Raven Gap starts under EW-degraded communications.
2. The link is constrained to 3 Kbps over a 10-second window.
3. Raw voice/report traffic does not fit.
4. The same report is compressed into structured mission metadata.
5. Compact CBOR metadata crosses the peer link.
6. The S2 dashboard decodes and verifies the frame.
7. The commander picture updates: map/readiness state, source context, and S2 view.

The current P0 readiness update uses the 9-line/CASEVAC fixture (`raven_gap_nine_line_1`).

## What The Demo Proves

TacNet Edge demonstrates one core idea:

> Make every byte over the tactical mesh carry more command value.

The transmitted payload is not raw microphone audio and not the full transcript. It is compact semantic metadata that carries enough command value for the receiver to reconstruct the tactical meaning and update the commander picture.

## Repository Layout

```text
Backend/      FastAPI backend, Raven Gap state, receiver decode API
Frontend/     React + Vite S2 dashboard and embedded WebRTC receiver
prototype/    Browser sender prototype, signaling server, local STT path
localdocs/    Local-only planning/reference docs, ignored by Git
docs/         Local-only docs if present, ignored by Git
```

## Local Quick Start

Run these from the repository root in separate terminals.

### Backend

```bash
cd Backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Backend URL:

```text
http://localhost:8000
```

The backend loads `.env` from the repository root, not from `Backend/`. The primary demo path is deterministic and does not require API keys.

### Frontend Dashboard

```bash
cd Frontend
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
```

Same-machine dashboard URL:

```text
http://localhost:5173?room=0000
```

Two-machine dashboard URL, when the sender prototype server runs on another laptop:

```text
http://localhost:5173?room=0000&signal=http://<sender-ip>:8787
```

The map should show an `S2 RX 0000` chip. That chip is the embedded WebRTC receiver status.

### Sender Prototype

On the sender laptop:

```bash
node prototype/server.mjs
```

Open:

```text
http://localhost:8787/?role=sender&room=0000
```

Use Chrome if possible. Browser microphone capture is most reliable when the sender page is opened as `localhost` on the sender laptop.

If local STT is unavailable, use the sender page's sample buttons or manual transcript box. Those still exercise metadata extraction, CBOR encoding, shaped-link transmission, and receiver decoding.

## Two-Machine Demo Topology

Main/projected laptop:

```text
Backend:   http://localhost:8000
Dashboard: http://localhost:5173?room=0000&signal=http://<sender-ip>:8787
```

Second/sender laptop:

```text
Prototype server: node prototype/server.mjs
Sender page:      http://localhost:8787/?role=sender&room=0000
```

Important details:

- The room is exact and case-sensitive. Use `0000`.
- The dashboard is the receiver. Do not open a separate prototype receiver tab unless debugging.
- The dashboard `signal=` query must point to the sender laptop's prototype server.
- If both machines use different signaling servers, WebRTC will stay stuck connecting.

Find the sender laptop IP on macOS:

```bash
ipconfig getifaddr en0
```

Fallback:

```bash
route -n get default | awk '/interface:/{print $2}' | xargs -I{} ipconfig getifaddr {}
```

## Demo Flow

1. Start backend and frontend on the projected laptop.
2. Start `prototype/server.mjs` on the sender laptop.
3. Open the projected dashboard with `room=0000` and `signal=http://<sender-ip>:8787`.
4. Open the sender page with `role=sender&room=0000`.
5. On the sender page, click `Connect Peer`.
6. Use `Sample CASEVAC`, a manual transcript, or local STT.
7. Send the report.
8. Watch the dashboard `S2 RX` chip and Raven Gap map/readiness state update.

## Dashboard Controls

On the S2 dashboard:

- `REPLAY SCENARIO` starts the Raven Gap replay.
- `STEP` advances one report manually.
- `RESET` resets the scenario and clears received peer events.
- `EW DEGRADED` toggles the degraded 3 Kbps link view.
- `S2 RX 0000` shows embedded receiver status for the WebRTC peer link.
- The overlay tabs expose reports, mesh, SITREP, timeline, voice, receiver, and assets panels.

The `VOICE` overlay is the single-machine fallback path:

- `SEND 9-LINE` submits the prerecorded 9-line fixture to the backend.
- `COMPRESSION OFF/ON` controls whether the fixture is blocked as raw audio or processed as compressed metadata.
- With compression on, the panel decodes a demo receiver frame and updates the same dashboard state used by the peer path.

Use the two-machine sender path for the full live demo. Use the `VOICE` overlay only for local rehearsal or fallback.

Clean reset before rehearsal or demo:

```bash
curl -X POST http://localhost:8000/reset
```

If the dashboard still shows a previous received frame after reset, hard-refresh the dashboard tab.

## Backend API

Core endpoints:

```text
GET  /scenarios
GET  /state
POST /scenario/select        { "scenario_id": "raven_gap" }
POST /simulate/start
POST /simulate/step
POST /reset
POST /comms/degrade          { "degraded": true, "kbps": 3 }
POST /compression/toggle     { "enabled": true }
POST /voice/report           { "audio_id": "raven_gap_nine_line_1" }
POST /api/receiver/decode    { "frame_hex": "...", "room": "0000", "source": "embedded-s2-receiver" }
```

Voice-report smoke:

```bash
curl -s -X POST http://localhost:8000/comms/degrade \
  -H 'Content-Type: application/json' \
  -d '{"degraded": true, "kbps": 3}'

curl -s -X POST http://localhost:8000/voice/report \
  -H 'Content-Type: application/json' \
  -d '{"audio_id": "raven_gap_nine_line_1"}'

curl -s -X POST http://localhost:8000/compression/toggle \
  -H 'Content-Type: application/json' \
  -d '{"enabled": true}'

curl -s -X POST http://localhost:8000/voice/report \
  -H 'Content-Type: application/json' \
  -d '{"audio_id": "raven_gap_nine_line_1"}'
```

Expected behavior:

- Compression off: `voice_report.status` is `blocked_raw`; no voice event is appended.
- Compression on: `voice_report.status` is `processed`; the 9-line event is appended once.
- Receiver decode: `/api/receiver/decode` accepts compact frame bytes and adds a received event for dashboard state.

Receiver fixture smoke:

```bash
curl -s -X POST http://localhost:8000/api/receiver/decode \
  -H 'Content-Type: application/json' \
  -d '{"use_fixture": true, "room": "0000", "source": "manual-smoke"}'
```

Check state:

```bash
curl -s http://localhost:8000/state
```

## Validation

Backend tests:

```bash
cd Backend
.venv/bin/python -m pytest tests/
```

Frontend build:

```bash
cd Frontend
npm run build
```

Prototype local peer test, when needed:

```bash
node prototype/scripts/local-peer-test.mjs
```

## Troubleshooting

If the dashboard shows `MOCK`, the backend is not reachable from the browser:

```bash
curl http://localhost:8000/state
```

If `S2 RX` stays connecting:

- Confirm sender is opened at `http://localhost:8787/?role=sender&room=0000`.
- Confirm dashboard URL includes `signal=http://<sender-ip>:8787`.
- Confirm both sides use room `0000`.
- Confirm `node prototype/server.mjs` is running on the sender laptop.
- Use Chrome on both machines.

If Squad 1 / 1-A RFL starts red before sending:

```bash
curl -X POST http://localhost:8000/reset
```

Then hard-refresh the dashboard tab.

If ports are already in use:

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
lsof -nP -iTCP:5173 -sTCP:LISTEN
lsof -nP -iTCP:8787 -sTCP:LISTEN
```

## Scope Notes

- The current demo is a Mac/browser P0 runtime.
- The live receiver path uses WebRTC DataChannel plus FastAPI receiver decode.
- The transmitted payload is compact semantic metadata, not raw microphone audio.
- The current map readiness update is driven by the 9-line/CASEVAC fixture.
- iPhone, BLE mesh, LoRa, ATAK plugin, Cactus/Gemma mobile runtime, COMSEC, and tactical-radio integration are future paths, not current demo dependencies.
