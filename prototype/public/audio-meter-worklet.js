/**
 * AudioWorklet RMS meter for low-latency microphone instrumentation.
 */
class TacNetAudioMeter extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frame = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    let sum = 0;
    for (let index = 0; index < channel.length; index += 1) {
      sum += channel[index] * channel[index];
    }
    this.frame += 1;
    if (this.frame % 8 === 0) {
      this.port.postMessage({ rms: Math.sqrt(sum / channel.length) });
    }
    return true;
  }
}

registerProcessor("tacnet-audio-meter", TacNetAudioMeter);
