#startup/tacnet #AI

# Technical Moat — On-Device Intelligence

==The moat is moving the intelligence to the edge. Every device is its own inference node.==

## SLM integration
- **Gemma 4 family** of Small Language Models, specifically optimized variants like **E4B (Edge 4B)**.
- Runs through the **Cactus** runtime (low-latency on-device inference engine, INT4 on Apple NPU).
- Single multimodal model handles **STT + summarization** in one pass — Gemma 4 has a native ~300M-param audio conformer encoder, so no separate Whisper.
- Today: iOS prototype using `cactus-ios.xcframework`. Tomorrow: NPU-optimized SDR rigs.

## Semantic compression
- Don't transmit raw audio. Don't transmit heavy data packets.
- ==Use AI on-device to extract the **intent** of a message and ship that.==
- Example: a 2 MB voice report → on-device processing → a **10-byte intent token**.
- Receiving nodes can re-expand the token into TTS audio, doctrine-formatted text, or structured data depending on role.

## The transmission math (Shannon)
Channel capacity follows:

$$C = B \log_2(1 + \mathrm{SNR})$$

- $C$ = capacity (bits/sec)
- $B$ = bandwidth (Hz)
- $\mathrm{SNR}$ = signal-to-noise ratio

==The lower the data requirement, the lower the $C$ you can tolerate, and the lower $C$ you can tolerate, the worse the SNR you can survive.== Traditional radios fail when SNR drops below their fixed threshold. TacNet's intent tokens are so small that the system stays connected at near-zero $C$ — i.e., where the adversary thinks they've won the EW fight.

## Protocol-agnostic transport
- **Prototype**: Bluetooth Low Energy (BLE) mesh for iOS development and hackathon demos.
- **Production**:
  - **Long-range radio** (LoRa / SDR with FHSS) — primary dismounted transport, EW-resilient.
  - **ATAK integration** — vehicle-mounted tablets and commander COP run on Android Tactical Assault Kit, the standard DoC warfighter platform.
  - **NPU-optimized inference** — purpose-built edge hardware for the SLM stack at scale.
- The transport changes; the semantic layer above it doesn't.

## Why this is defensible
- Most defense-tech "AI" is a wrapper around a cloud LLM — useless when the cloud is gone.
- TacNet's whole stack runs offline. That's the moat.
- Cornell research collab + STTR funding compounds the lead.

## Related
- [[tacnet homepage]]
- [[architecture]]
- [[solution]]
- [[LLM homepage]]
