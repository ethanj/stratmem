/**
 * Link-budget metric rendering for the voice metadata demo.
 *
 * Builds the pre-compression versus post-compression comparison shown in the
 * Low-Bandwidth Link panel. Raw speech is estimated with a 6 kbit/s voice codec
 * so the display compares a realistic compressed-audio baseline against the
 * actual CBOR metadata frame sent over the peer link.
 */
const speechCodecBitsPerSecond = 6000;
const textEncoder = new TextEncoder();

export function renderLinkMetrics({ transcript, metadata, binaryBytes, speechMs, bandwidthKbps, jitterMs }) {
  const audioEstimate = estimateAudioBytes(transcript, speechMs);
  const transcriptBytes = textEncoder.encode(transcript).length;
  const jsonBytes = textEncoder.encode(JSON.stringify(metadata ?? {})).length;
  const budgetBytes = Math.floor((bandwidthKbps * 1000 * 10) / 8);
  const compression = binaryBytes > 0 ? audioEstimate / binaryBytes : 0;

  return [
    renderCompressionVisual(audioEstimate, binaryBytes, compression),
    renderMetric("Audio estimate", `${audioEstimate} B`, "pre-compression at 6 kbit/s"),
    renderMetric("Transcript", `${transcriptBytes} B`, "local only"),
    renderMetric("Metadata JSON", `${jsonBytes} B`, "debug only"),
    renderMetric("CBOR frame", `${binaryBytes} B`, `${formatRatio(compression)} smaller than audio`),
    renderMetric("10 sec budget", `${budgetBytes} B`, `${bandwidthKbps} Kbps link`),
    renderMetric("Jitter", `${jitterMs} ms`, "randomized queue delay"),
  ].join("");
}

function renderCompressionVisual(audioBytes, binaryBytes, compression) {
  const binaryPercent = audioBytes > 0 ? Math.max(1, Math.min(100, (binaryBytes / audioBytes) * 100)) : 0;
  return `
    <div class="compression-visual">
      ${renderBar("Pre-compression raw audio", audioBytes, 100)}
      ${renderBar("Post-compression binary", binaryBytes, binaryPercent)}
      <div class="compression-ratio">${escapeHtml(formatRatio(compression))} compression</div>
    </div>
  `;
}

function renderBar(label, bytes, percent) {
  return `
    <div class="compression-row">
      <span>${escapeHtml(label)}</span>
      <div class="compression-track"><b style="width: ${percent.toFixed(1)}%"></b></div>
      <strong>${escapeHtml(`${bytes} B`)}</strong>
    </div>
  `;
}

function renderMetric(label, value, note) {
  return `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)} - ${escapeHtml(note)}</span></div>`;
}

function estimateAudioBytes(transcript, speechMs) {
  const durationMs = speechMs > 0 ? speechMs : estimateSpeechMs(transcript);
  return Math.ceil((durationMs / 1000) * (speechCodecBitsPerSecond / 8));
}

function estimateSpeechMs(transcript) {
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.max(2, words / 2.5);
  return estimatedSeconds * 1000;
}

function formatRatio(compression) {
  return compression > 0 ? `${compression.toFixed(1)}x` : "--";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
