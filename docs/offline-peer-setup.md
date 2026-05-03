# Offline Peer Setup

This guide explains how to run the P0 two-computer demo.

Topology:

`sender laptop microphone -> local whisper.cpp STT -> metadata -> CBOR -> WebRTC peer link -> S2 dashboard receiver -> S2 backend decode -> readiness update`

## Roles

### Sender Laptop

The sender is the only machine that needs the repo, Node.js, `whisper.cpp`, and
the Whisper `base.en` model for the P0 audio-to-text path.

The sender runs:

- Static web app
- WebRTC signaling endpoint
- Local `whisper.cpp` transcription endpoint
- Browser microphone capture
- Metadata extraction and CBOR encoding

### Receiver Laptop

For the P0 demo, the receiver is the S2 dashboard. It does not open a separate
peer receiver page. The React dashboard embeds the WebRTC receiver client,
listens on room `0000`, decodes received binary frames through FastAPI, and
updates readiness.

The receiver needs:

- A laptop on the same Wi-Fi or LAN as the sender
- A modern browser, preferably Chrome
- The S2 backend at `http://localhost:8000`
- The S2 frontend at `http://localhost:5173`
- Network access to the sender signaling server if the sender runs on another laptop

`localhost` is per machine. On one laptop, both sender and S2 can use localhost.
On two physical laptops, at least one side must use the other laptop's LAN IP.
`0.0.0.0` is only the bind address used by servers; it is not the URL another
browser should open.

## One-Receiver-URL Demo Shape

Use these defaults for the cleanest live demo:

| Role | URL |
|---|---|
| S2 / Receiver, same laptop test | `http://localhost:5173?room=0000` |
| Sender, same laptop test | `http://localhost:8787/?role=sender&room=0000` |
| S2 / Receiver, sender hosted elsewhere | `http://localhost:5173?room=0000&signal=http://<sender-ip>:8787` |
| Sender, two-laptop demo | `http://localhost:8787/?role=sender&room=0000` |

The receiver no longer needs to open `http://<sender-ip>:8787` unless you want
to use the old standalone receiver debug page.

## S2 Dashboard Auto-Trigger

The embedded S2 receiver automatically forwards each received binary metadata
frame to the S2 backend decode endpoint:

```text
POST http://<s2-backend>:8000/api/receiver/decode
```

The S2 dashboard also polls `/state`. When it sees any verified decoded metadata
frame from the peer receiver, it turns compression on, submits the existing
9-line flow, and refreshes the COP. This is the trigger mechanism that replaces
manually clicking `SEND 9-LINE` in the S2 `VOICE` tab.

### Start S2 On The Receiver Laptop

Start the S2 backend on the receiver laptop:

```bash
cd Backend
PYTHONPATH=. .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Start the S2 frontend on the receiver laptop:

```bash
cd Frontend
npm run dev
```

Open the S2 dashboard:

```text
http://localhost:5173?room=0000
```

If the sender signaling server is running on a different laptop, add `signal`
with the sender laptop's LAN IP:

```text
http://localhost:5173?room=0000&signal=http://10.1.60.244:8787
```

The map should show an `S2 RX 0000` status chip.

## Sender Setup

Install prerequisites:

- Git
- Node.js 20 or newer
- CMake
- A C/C++ compiler, such as Xcode Command Line Tools on macOS

Clone the repo:

```bash
git clone https://github.com/ethanj/stratmem.git
cd stratmem
git checkout feature/audio-semantic-compression-architecture
```

Install local STT dependencies:

```bash
mkdir -p localdeps
git clone https://github.com/ggml-org/whisper.cpp.git localdeps/whisper.cpp
cd localdeps/whisper.cpp
sh ./models/download-ggml-model.sh base.en
cmake -B build
cmake --build build -j --config Release
cd ../..
```

Start the server:

```bash
node prototype/server.mjs
```

The server binds to `0.0.0.0:8787`, which means it listens on localhost and the
sender laptop's LAN interfaces. The sender page URL is:

```text
http://localhost:8787/?role=sender&room=0000
```

Find the sender LAN IP:

```bash
ifconfig | grep "inet "
```

Use the LAN address on the active Wi-Fi or Ethernet adapter. It usually looks
like `10.x.x.x`, `172.16.x.x`, or `192.168.x.x`.

## Receiver Setup

Open the S2 dashboard on the receiver laptop:

```text
http://localhost:5173?room=0000
```

If the sender prototype server is on a different laptop, include its signaling
URL:

```text
http://localhost:5173?room=0000&signal=http://<sender-ip>:8787
```

The S2 dashboard is now the receiver. Do not open a second receiver tab unless
you are debugging the standalone prototype.

## Demo Run

1. Start the S2 backend and frontend on the dashboard machine.
2. Start the prototype server on the sender machine.
3. S2 opens `http://localhost:5173?room=0000`.
4. Sender opens `http://localhost:8787/?role=sender&room=0000`.
5. Sender clicks `Connect Peer`.
6. Sender clicks `Connect Offline STT`.
7. Sender holds `Hold to Talk`, speaks a short mission report, then releases.
8. Any verified metadata message should trigger the S2 dashboard automatically:
    the `VOICE` tab shows the
    received binary frame, Soldier 1 shows the 9-line transmission, and Soldier
    2 changes to critical/CASEVAC pending.
9. Sender can click `Kill Switch` to send a control frame that marks the source
    device dead on the receiver.

Sample report:

```text
Alpha Two is at grid 12345678, one casualty, low ammo, requesting resupply at checkpoint Bravo.
```

Expected receiver text:

```text
Alpha Two at grid 12345678: sustainment issue: one casualty, low ammo. Request resupply to checkpoint Bravo.
```

## What Is Transmitted

The constrained peer link transmits the compact CBOR metadata frame.
The kill switch transmits a compact CBOR control frame over the same peer link.

It does not transmit:

- Raw microphone audio
- Full WAV files
- Raw transcript text
- OpenAI or hosted LLM requests

The sender's transcript and metadata JSON panels are local debug views.

## If The Receiver Wants A Local Copy

The receiver can clone the repo for review or development:

```bash
git clone https://github.com/ethanj/stratmem.git
cd stratmem
git checkout feature/audio-semantic-compression-architecture
```

They still should open the sender-hosted URL during the P0 demo. Running their
own `node prototype/server.mjs` creates a separate signaling server and will not
connect to the sender unless both users intentionally modify the app to use a
shared signaling server.

## Troubleshooting

Live logs are written on the sender laptop to:

```text
logs/live-events.jsonl
```

That file records client actions, peer states, signaling posts/polls, STT
events, sent frames, received frames, and errors.

| Symptom | Fix |
|---|---|
| S2 RX chip shows error | Confirm `node prototype/server.mjs` is running and the S2 URL has the right `signal=http://<sender-ip>:8787` query when testing across laptops. |
| Browser microphone does not work | Use `http://localhost:8787` on the sender, not the LAN URL. |
| `Connect Peer` does not connect | Confirm sender and S2 both use room `0000` and the same signaling server. |
| S2 does not update after receive | Confirm FastAPI is running at `http://localhost:8000` on the S2 laptop. |
| Offline STT fails | Confirm `localdeps/whisper.cpp/build/bin/whisper-cli` and `localdeps/whisper.cpp/models/ggml-base.en.bin` exist on the sender. |
| Transcription is slow | Keep reports short and leave GPU disabled unless the demo laptop has been validated with `WHISPER_USE_GPU=1`. |
| Receiver sees text but no voice | P0 acceptance is reconstructed text. Use `Speak Last` if browser TTS is needed. |

## Scope Boundaries

- This is a P0 demo, not a secure tactical radio product.
- No COMSEC, BLE mesh, LoRa, SDR, ATAK, or mobile app path is included.
- Cactus/Gemma is a later mobile product path, not the current Mac P0 runtime.
