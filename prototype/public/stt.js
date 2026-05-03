/**
 * Offline whisper.cpp transcription client.
 *
 * Captures push-to-talk microphone audio as PCM, encodes it as 16 kHz mono WAV,
 * and posts it to the local Node server. The server runs whisper.cpp so the P0
 * path does not require hosted model calls or internet during operation.
 */
const targetSampleRate = 16000;

export class OfflineWhisperTranscriber extends EventTarget {
  constructor() {
    super();
    this.stream = null;
    this.audioContext = null;
    this.source = null;
    this.recorderNode = null;
    this.silenceNode = null;
    this.chunks = [];
    this.connected = false;
    this.recording = false;
  }

  async connect() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.audioContext = new AudioContext();
    await this.audioContext.audioWorklet.addModule("/audio-recorder-worklet.js");
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.recorderNode = new AudioWorkletNode(this.audioContext, "tacnet-audio-recorder");
    this.silenceNode = this.audioContext.createGain();
    this.silenceNode.gain.value = 0;
    this.recorderNode.port.onmessage = (event) => this.handleRecorderMessage(event.data);
    this.source.connect(this.recorderNode);
    this.recorderNode.connect(this.silenceNode);
    this.silenceNode.connect(this.audioContext.destination);
    this.connected = true;
    this.emit("ready", {});
  }

  start() {
    if (!this.connected || !this.recorderNode) {
      throw new Error("STT is not connected");
    }
    this.chunks = [];
    this.recording = true;
    this.recorderNode.port.postMessage({ type: "recording", enabled: true });
    this.emit("speech_started", { at: performance.now() });
  }

  async stop() {
    if (!this.recording || !this.recorderNode) {
      return;
    }
    this.recording = false;
    this.recorderNode.port.postMessage({ type: "recording", enabled: false });
    this.emit("speech_stopped", { at: performance.now() });
    await this.transcribeBufferedAudio();
  }

  close() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.source?.disconnect();
    this.recorderNode?.disconnect();
    this.silenceNode?.disconnect();
    this.audioContext?.close();
  }

  handleRecorderMessage(message) {
    if (message.type === "samples" && this.recording) {
      this.chunks.push(new Float32Array(message.samples));
      this.emit("level", { rms: message.rms });
    }
  }

  async transcribeBufferedAudio() {
    const samples = mergeChunks(this.chunks);
    if (samples.length < this.audioContext.sampleRate / 4) {
      this.emit("error", { message: "Recording too short" });
      return;
    }
    const wav = encodeWav(resample(samples, this.audioContext.sampleRate, targetSampleRate), targetSampleRate);
    this.emit("transcribing", { bytes: wav.byteLength });
    const response = await fetch("/api/local/transcribe", {
      method: "POST",
      headers: { "content-type": "audio/wav" },
      body: wav,
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? "Local STT failed");
    }
    this.emit("completed", {
      text: body.transcript ?? "",
      elapsedMs: body.elapsed_ms,
      audioBytes: wav.byteLength,
    });
  }

  emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

function mergeChunks(chunks) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function resample(input, inputRate, outputRate) {
  if (inputRate === outputRate) {
    return input;
  }
  const ratio = inputRate / outputRate;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let index = 0; index < output.length; index += 1) {
    output[index] = input[Math.floor(index * ratio)] ?? 0;
  }
  return output;
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(44 + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return buffer;
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
