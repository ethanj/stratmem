# TacNet Voice Metadata Prototype

This prototype proves the P0 voice-to-metadata compression path:

`voice -> local transcript -> mission metadata JSON -> CBOR binary -> shaped link -> decoded metadata -> S2 summary`

## Run

Install the local STT runtime once:

```bash
git clone https://github.com/ggml-org/whisper.cpp.git localdeps/whisper.cpp
cd localdeps/whisper.cpp
sh ./models/download-ggml-model.sh base.en
cmake -B build
cmake --build build -j --config Release
cd ../..
```

Start the prototype:

```bash
node prototype/server.mjs
```

Open:

- Sender laptop: `http://localhost:8787`
- Receiver laptop: `http://<sender-laptop-ip>:8787`

Use the same room name on both laptops. Select `Sender` on the sender laptop and
`Receiver` on the receiver laptop, then click `Connect Peer` on both.
See `docs/offline-peer-setup.md` for the exact two-computer setup and receiver
instructions.

For microphone access, run the sender on `localhost`. Browsers generally block
microphone access on insecure LAN origins.

## Offline STT

Click `Connect Offline STT` on the sender before using push-to-talk. The browser
records local PCM, posts a WAV to the local server, and the server runs
`whisper.cpp` with `base.en`. Override paths with:

```bash
WHISPER_CPP_BIN=/path/to/whisper-cli \
WHISPER_MODEL_PATH=/path/to/ggml-base.en.bin \
node prototype/server.mjs
```

The server defaults `whisper.cpp` to CPU mode for reliability. Set
`WHISPER_USE_GPU=1` only after validating Metal/GPU startup on the demo laptop.

If local STT is unavailable, use the manual transcript box and sample buttons to
exercise metadata extraction, CBOR encoding, constrained-link transmission, and
receiver decoding.

The STT endpoint accepts localhost requests only. Run the sender browser on
`http://localhost:8787`; use the LAN URL only for the receiver.

## What The Demo Shows

- Original transcript stays local and is not transmitted over the shaped link.
- Metadata JSON is visible for debugging but is not transmitted.
- CBOR bytes are transmitted through the WebRTC DataChannel.
- The link defaults to 3 Kbps with jitter.
- The receiver reconstructs S2/commander-readable text from decoded metadata.
- Browser TTS remains available with `Speak Last`, but text reconstruction is
  the P0 acceptance target.

## Scope Boundaries

- No encryption or COMSEC claim.
- No BLE, LoRa, SDR, ATAK, or mobile app path.
- No hosted LLM rewrite on the receiver.
- No OpenAI dependency for the P0 audio-to-text path.
- Metadata extraction is deterministic for P0 report types.
