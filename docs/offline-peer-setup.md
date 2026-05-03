# Offline Peer Setup

This guide explains how to run the P0 two-computer demo.

Topology:

`sender laptop microphone -> local whisper.cpp STT -> metadata -> CBOR -> WebRTC peer link -> receiver browser -> decoded text`

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

For the P0 demo, the receiver does not need to install the repo or model. The
receiver opens the web app served by the sender over the local network.

The receiver needs:

- A laptop on the same Wi-Fi or LAN as the sender
- A modern browser, preferably Chrome
- Network access to `http://<sender-ip>:8787`

Do not run a separate copy of the server on the receiver for the P0 demo. Both
browsers must use the sender's server so they share the same signaling room.

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

Find the sender LAN IP:

```bash
ifconfig | grep "inet "
```

Use the LAN address on the active Wi-Fi or Ethernet adapter. It usually looks
like `10.x.x.x`, `172.16.x.x`, or `192.168.x.x`.

## Receiver Setup

On the receiver laptop, open:

```text
http://<sender-ip>:8787
```

Example:

```text
http://10.1.60.244:8787
```

The receiver does not need to clone the repo unless they want to inspect or
develop the code.

## Demo Run

1. Sender opens `http://localhost:8787`.
2. Receiver opens `http://<sender-ip>:8787`.
3. Both machines use the same room name, for example `raven-gap`.
4. Sender selects `Sender`.
5. Receiver selects `Receiver`.
6. Both click `Connect Peer`.
7. Sender clicks `Connect Offline STT`.
8. Sender holds `Hold to Talk`, speaks a short report, then releases.
9. Receiver should see decoded metadata and reconstructed S2 text.
10. Sender can click `Kill Switch` to send a control frame that marks the source
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

| Symptom | Fix |
|---|---|
| Receiver cannot open sender URL | Confirm both laptops are on the same network and the sender server is running. |
| Browser microphone does not work | Use `http://localhost:8787` on the sender, not the LAN URL. |
| `Connect Peer` does not connect | Confirm both browsers use the same room and the same sender-hosted server. |
| Offline STT fails | Confirm `localdeps/whisper.cpp/build/bin/whisper-cli` and `localdeps/whisper.cpp/models/ggml-base.en.bin` exist on the sender. |
| Transcription is slow | Keep reports short and leave GPU disabled unless the demo laptop has been validated with `WHISPER_USE_GPU=1`. |
| Receiver sees text but no voice | P0 acceptance is reconstructed text. Use `Speak Last` if browser TTS is needed. |

## Scope Boundaries

- This is a P0 demo, not a secure tactical radio product.
- No COMSEC, BLE mesh, LoRa, SDR, ATAK, or mobile app path is included.
- Cactus/Gemma is a later mobile product path, not the current Mac P0 runtime.
