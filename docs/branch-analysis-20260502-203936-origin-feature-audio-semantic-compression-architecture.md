# Branch Analysis - origin/feature/audio-semantic-compression-architecture - 20260502-203936 PDT

## Snapshot

Ref: `origin/feature/audio-semantic-compression-architecture`  
SHA: `a088dfbd1990`

This branch is a standalone voice-to-metadata prototype, not an integrated Branch B implementation.

## What Is Done

Added files include:

- `Architecture.md`
- `docs/offline-peer-setup.md`
- `docs/tacnet-voice-compression-architecture.svg`
- `prototype/README.md`
- `prototype/server.mjs`
- `prototype/public/app.js`
- `prototype/public/codec.js`
- `prototype/public/metadata.js`
- `prototype/public/stt.js`
- `prototype/public/link.js`
- audio worklets and styles

Implemented prototype capabilities:

- Browser push-to-talk capture.
- Optional offline local `whisper.cpp` transcription.
- Deterministic metadata extraction for simple report families.
- Compact metadata object.
- CBOR frame encoding with integer keys.
- WebRTC DataChannel signaling and constrained-link shaping.
- 3 Kbps default link with jitter.
- Receiver decodes metadata and reconstructs readable text.
- Manual transcript fallback if STT is unavailable.

## Relevance To Current v3 Demo

This branch validates the product hypothesis more deeply than the current hackathon app needs. It proves that "do not transmit audio; transmit mission metadata" is technically plausible.

Useful pieces to borrow conceptually:

- deterministic extraction first;
- fixed report schemas;
- local/manual transcript fallback;
- byte budget display;
- receiver reconstruction from verified fields;
- no hosted LLM required for P0;
- clear boundary that audio/transcript/debug JSON are not the constrained payload in future protocol work.

## Why It Should Not Be Merged Wholesale For The 3-Minute Demo

The current v3 app plan intentionally does less:

- one prerecorded voice report;
- stored transcript for reliability;
- transmit format is JSON for the demo;
- one SALUTE-style schema;
- no live mic;
- no live STT;
- no WebRTC/CBOR/peer networking;
- no separate receiver screen.

This branch adds a second app, a second server, whisper setup, WebRTC room flow, CBOR, and two-browser/two-laptop concerns. That is too much live-demo surface for the remaining hackathon integration unless the core app is already stable.

## Delta Against v3

| Topic | Prototype branch | v3 app target |
|---|---|---|
| Audio | Live push-to-talk possible | Prerecorded audio, stored transcript |
| STT | Local `whisper.cpp` optional path | No live STT in demo |
| Transmit format | CBOR binary frame | JSON for demo |
| Transport | WebRTC DataChannel | Simulated app state/byte budget |
| Report scope | Multiple simple report types | One SALUTE report |
| UI | Separate sender/receiver prototype | Main TacNet Edge dashboard |

## Practical Use

Do not block on this branch for P0.

If time allows, use it as reference for:

- `Backend/app/voice/salute_extractor.py`
- byte-count labels and copy;
- future roadmap language;
- backup Q&A if judges ask how the architecture moves beyond JSON.

For the hackathon app, the implementation should be simpler:

1. Store the Team B transcript fixture.
2. Convert it deterministically to the expected SALUTE JSON.
3. Show raw audio bytes over 3 Kbps budget when compression is OFF.
4. Show JSON bytes under 3 Kbps budget when compression is ON.
5. Append that structured event into the existing Raven Gap stream.

## Merge Recommendation

Keep this branch separate. Cherry-pick no large app files into Branch B.

Only reuse small deterministic extraction ideas if they save time. The main FastAPI/React app already has enough work to finish.
