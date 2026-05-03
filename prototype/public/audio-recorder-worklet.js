/**
 * AudioWorklet processor for push-to-talk PCM capture.
 *
 * The node only posts samples while recording is enabled, keeping the browser
 * path local and avoiding encoded audio containers before whisper.cpp receives
 * a 16 kHz mono WAV from the main thread.
 */
class TacnetAudioRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recording = false;
    this.port.onmessage = (event) => {
      if (event.data?.type === "recording") {
        this.recording = Boolean(event.data.enabled);
      }
    };
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input || !this.recording) {
      return true;
    }
    const samples = new Float32Array(input.length);
    samples.set(input);
    this.port.postMessage({ type: "samples", samples, rms: rms(input) }, [samples.buffer]);
    return true;
  }
}

function rms(samples) {
  let sum = 0;
  for (const sample of samples) {
    sum += sample * sample;
  }
  return Math.sqrt(sum / Math.max(samples.length, 1));
}

registerProcessor("tacnet-audio-recorder", TacnetAudioRecorder);
