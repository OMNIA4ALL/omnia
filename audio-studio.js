/**
 * OMNIA 2.0 - Division 21: Audio Analysis & Processing Studio
 * Web Audio API visual analysis (Waveform, Real-time FFT, Spectrogram), region trimming, and WAV export.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    showToast(m, t) { console.log(m, t); }
  };

  const AudioStudioModule = {
    audioCtx: null,
    audioBuffer: null,
    sourceNode: null,
    analyserNode: null,
    isPlaying: false,
    startTime: 0,
    pauseOffset: 0,
    playbackRate: 1.0,
    trimStart: 0,
    trimEnd: 0,
    animationId: null,
    spectrogramHistory: [],

    init() {
      this.bindEvents();
    },

    getAudioContext() {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    },

    bindEvents() {
      const dropZone = document.getElementById('audio-drop-zone');
      const fileInput = document.getElementById('audio-file-input');

      dropZone?.addEventListener('click', () => fileInput?.click());
      dropZone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-indigo-500', 'bg-indigo-500/10');
      });
      dropZone?.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-500/10');
      });
      dropZone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-500/10');
        if (e.dataTransfer?.files?.length) {
          this.loadFile(e.dataTransfer.files[0]);
        }
      });

      fileInput?.addEventListener('change', (e) => {
        if (e.target.files?.length) {
          this.loadFile(e.target.files[0]);
        }
      });

      // Playback Controls
      document.getElementById('audio-play-btn')?.addEventListener('click', () => this.togglePlay());
      document.getElementById('audio-stop-btn')?.addEventListener('click', () => this.stop());

      // Playback rate
      document.getElementById('audio-rate-select')?.addEventListener('change', (e) => {
        this.playbackRate = parseFloat(e.target.value) || 1.0;
        if (this.sourceNode) this.sourceNode.playbackRate.value = this.playbackRate;
      });

      // Trimming markers
      document.getElementById('audio-set-start-btn')?.addEventListener('click', () => {
        this.trimStart = this.getCurrentPlaybackTime();
        this.updateTrimInputs();
        this.drawWaveform();
        storage.showToast(`Trim start set to ${this.trimStart.toFixed(2)}s`, 'info');
      });

      document.getElementById('audio-set-end-btn')?.addEventListener('click', () => {
        this.trimEnd = this.getCurrentPlaybackTime();
        this.updateTrimInputs();
        this.drawWaveform();
        storage.showToast(`Trim end set to ${this.trimEnd.toFixed(2)}s`, 'info');
      });

      document.getElementById('audio-trim-start-input')?.addEventListener('change', (e) => {
        this.trimStart = Math.max(0, parseFloat(e.target.value) || 0);
        this.drawWaveform();
      });

      document.getElementById('audio-trim-end-input')?.addEventListener('change', (e) => {
        if (this.audioBuffer) {
          this.trimEnd = Math.min(this.audioBuffer.duration, parseFloat(e.target.value) || this.audioBuffer.duration);
        }
        this.drawWaveform();
      });

      // Export Trimmed Audio
      document.getElementById('audio-export-trim-btn')?.addEventListener('click', () => {
        this.exportTrimmedAudio();
      });

      // Normalize Volume
      document.getElementById('audio-normalize-btn')?.addEventListener('click', () => {
        this.normalizeBuffer();
      });

      // Window resize re-draws canvas
      window.addEventListener('resize', () => {
        if (this.audioBuffer) {
          this.drawWaveform();
        }
      });
    },

    async loadFile(file) {
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|aac|flac|m4a|webm)$/i)) {
        storage.showToast('Please upload a supported audio file (MP3, WAV, OGG, AAC, FLAC)', 'warning');
        return;
      }

      const infoBox = document.getElementById('audio-meta-info');
      infoBox?.classList.remove('hidden');

      const nameEl = document.getElementById('audio-meta-name');
      const sizeEl = document.getElementById('audio-meta-size');
      if (nameEl) nameEl.textContent = file.name;
      if (sizeEl) sizeEl.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

      const ctx = this.getAudioContext();
      const arrayBuffer = await file.arrayBuffer();

      try {
        this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.pauseOffset = 0;
        this.trimStart = 0;
        this.trimEnd = this.audioBuffer.duration;

        const durEl = document.getElementById('audio-meta-duration');
        const rateEl = document.getElementById('audio-meta-rate');
        const chanEl = document.getElementById('audio-meta-channels');

        if (durEl) durEl.textContent = `${this.audioBuffer.duration.toFixed(2)}s`;
        if (rateEl) rateEl.textContent = `${this.audioBuffer.sampleRate} Hz`;
        if (chanEl) chanEl.textContent = this.audioBuffer.numberOfChannels === 2 ? 'Stereo (2ch)' : 'Mono (1ch)';

        this.updateTrimInputs();
        this.drawWaveform();
        this.calculateAmplitudeMetrics();
        storage.showToast('Audio loaded and decoded successfully', 'success');
      } catch (err) {
        console.error('[Audio Studio] Decode error:', err);
        storage.showToast('Unable to decode audio file', 'error');
      }
    },

    updateTrimInputs() {
      const startIn = document.getElementById('audio-trim-start-input');
      const endIn = document.getElementById('audio-trim-end-input');
      if (startIn) startIn.value = this.trimStart.toFixed(2);
      if (endIn) endIn.value = this.trimEnd.toFixed(2);
    },

    togglePlay() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    },

    play() {
      if (!this.audioBuffer) return;
      const ctx = this.getAudioContext();

      this.sourceNode = ctx.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.playbackRate.value = this.playbackRate;

      this.analyserNode = ctx.createAnalyser();
      this.analyserNode.fftSize = 512;

      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(ctx.destination);

      const offset = this.pauseOffset >= this.audioBuffer.duration ? 0 : this.pauseOffset;
      this.sourceNode.start(0, offset);
      this.startTime = ctx.currentTime - offset / this.playbackRate;
      this.isPlaying = true;

      const playBtn = document.getElementById('audio-play-btn');
      if (playBtn) playBtn.innerHTML = '<span>⏸ Pause</span>';

      this.sourceNode.onended = () => {
        if (this.getCurrentPlaybackTime() >= this.audioBuffer.duration) {
          this.stop();
        }
      };

      this.startRealtimeVisualization();
    },

    pause() {
      if (!this.isPlaying) return;
      this.pauseOffset = this.getCurrentPlaybackTime();
      if (this.sourceNode) {
        try { this.sourceNode.stop(); } catch(e) {}
        this.sourceNode.disconnect();
      }
      this.isPlaying = false;

      const playBtn = document.getElementById('audio-play-btn');
      if (playBtn) playBtn.innerHTML = '<span>▶ Play</span>';

      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.drawWaveform();
    },

    stop() {
      if (this.sourceNode) {
        try { this.sourceNode.stop(); } catch(e) {}
        this.sourceNode.disconnect();
      }
      this.isPlaying = false;
      this.pauseOffset = 0;

      const playBtn = document.getElementById('audio-play-btn');
      if (playBtn) playBtn.innerHTML = '<span>▶ Play</span>';

      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.drawWaveform();
    },

    getCurrentPlaybackTime() {
      if (!this.isPlaying) return this.pauseOffset;
      const ctx = this.getAudioContext();
      return Math.min(this.audioBuffer.duration, (ctx.currentTime - this.startTime) * this.playbackRate);
    },

    drawWaveform() {
      const canvas = document.getElementById('audio-waveform-canvas');
      if (!canvas || !this.audioBuffer) return;

      const ctx = canvas.getContext('2d');
      const w = (canvas.width = canvas.parentElement.clientWidth || 800);
      const h = (canvas.height = 160);

      const data = this.audioBuffer.getChannelData(0);
      const step = Math.ceil(data.length / w);
      const amp = h / 2;

      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
      ctx.moveTo(0, h / 4); ctx.lineTo(w, h / 4);
      ctx.moveTo(0, (h * 3) / 4); ctx.lineTo(w, (h * 3) / 4);
      ctx.stroke();

      // Trim region highlight
      if (this.trimEnd > this.trimStart) {
        const startX = (this.trimStart / this.audioBuffer.duration) * w;
        const endX = (this.trimEnd / this.audioBuffer.duration) * w;
        ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.fillRect(startX, 0, endX - startX, h);

        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(startX, 0); ctx.lineTo(startX, h);
        ctx.moveTo(endX, 0); ctx.lineTo(endX, h);
        ctx.stroke();
      }

      // Draw Waveform bars
      ctx.fillStyle = '#818cf8';
      for (let i = 0; i < w; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
          const datum = data[i * step + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
        ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
      }

      // Draw Playhead
      const currentTime = this.getCurrentPlaybackTime();
      const playheadX = (currentTime / this.audioBuffer.duration) * w;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();

      const timeEl = document.getElementById('audio-current-time');
      if (timeEl) timeEl.textContent = `${currentTime.toFixed(2)}s / ${this.audioBuffer.duration.toFixed(2)}s`;
    },

    startRealtimeVisualization() {
      const specCanvas = document.getElementById('audio-spectrum-canvas');
      const specCtx = specCanvas ? specCanvas.getContext('2d') : null;

      const render = () => {
        if (!this.isPlaying) return;

        this.drawWaveform();

        // Render FFT spectrum analyzer
        if (this.analyserNode && specCanvas && specCtx) {
          const bufferLength = this.analyserNode.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          this.analyserNode.getByteFrequencyData(dataArray);

          const sw = (specCanvas.width = specCanvas.parentElement.clientWidth || 400);
          const sh = (specCanvas.height = 140);

          specCtx.fillStyle = '#0a0d14';
          specCtx.fillRect(0, 0, sw, sh);

          const barWidth = (sw / bufferLength) * 2.5;
          let barHeight;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * sh;

            // Gradient color from blue to magenta
            const hue = (i / bufferLength) * 260 + 180;
            specCtx.fillStyle = `hsl(${hue}, 80%, 55%)`;
            specCtx.fillRect(x, sh - barHeight, barWidth - 1, barHeight);

            x += barWidth;
          }
        }

        this.animationId = requestAnimationFrame(render);
      };

      this.animationId = requestAnimationFrame(render);
    },

    calculateAmplitudeMetrics() {
      if (!this.audioBuffer) return;
      const data = this.audioBuffer.getChannelData(0);

      let peak = 0;
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
        sumSquares += data[i] * data[i];
      }

      const rms = Math.sqrt(sumSquares / data.length);
      const peakDb = peak > 0 ? 20 * Math.log10(peak) : -100;
      const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -100;

      const peakEl = document.getElementById('audio-metric-peak');
      const rmsEl = document.getElementById('audio-metric-rms');
      const dynEl = document.getElementById('audio-metric-dyn');

      if (peakEl) peakEl.textContent = `${peakDb.toFixed(1)} dBFS`;
      if (rmsEl) rmsEl.textContent = `${rmsDb.toFixed(1)} dBFS`;
      if (dynEl) dynEl.textContent = `${(peakDb - rmsDb).toFixed(1)} dB`;
    },

    normalizeBuffer() {
      if (!this.audioBuffer) return;
      const numChannels = this.audioBuffer.numberOfChannels;

      let maxPeak = 0;
      for (let c = 0; c < numChannels; c++) {
        const data = this.audioBuffer.getChannelData(c);
        for (let i = 0; i < data.length; i++) {
          const abs = Math.abs(data[i]);
          if (abs > maxPeak) maxPeak = abs;
        }
      }

      if (maxPeak === 0 || maxPeak >= 0.99) {
        storage.showToast('Audio is already at optimum peak amplitude', 'info');
        return;
      }

      const scale = 0.98 / maxPeak;
      for (let c = 0; c < numChannels; c++) {
        const data = this.audioBuffer.getChannelData(c);
        for (let i = 0; i < data.length; i++) {
          data[i] *= scale;
        }
      }

      this.drawWaveform();
      this.calculateAmplitudeMetrics();
      storage.showToast(`Normalized audio peak to -0.2 dBFS (scale factor ${scale.toFixed(2)}x)`, 'success');
    },

    exportTrimmedAudio() {
      if (!this.audioBuffer) return;

      const start = Math.min(this.trimStart, this.trimEnd);
      const end = Math.max(this.trimStart, this.trimEnd);

      if (end - start < 0.2) {
        storage.showToast('Trim region is too short (min 0.2s)', 'warning');
        return;
      }

      const rate = this.audioBuffer.sampleRate;
      const startSample = Math.floor(start * rate);
      const endSample = Math.floor(end * rate);
      const numSamples = endSample - startSample;
      const numChannels = this.audioBuffer.numberOfChannels;

      const trimmedBuffer = this.getAudioContext().createBuffer(numChannels, numSamples, rate);
      for (let c = 0; c < numChannels; c++) {
        const srcData = this.audioBuffer.getChannelData(c);
        const destData = trimmedBuffer.getChannelData(c);
        for (let i = 0; i < numSamples; i++) {
          destData[i] = srcData[startSample + i];
        }
      }

      // Encode to standard 16-bit PCM WAV
      const wavBlob = this.encodeWav(trimmedBuffer);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trimmed-audio-${start.toFixed(1)}s-to-${end.toFixed(1)}s.wav`;
      a.click();
      URL.revokeObjectURL(url);
      storage.showToast('Exported trimmed WAV file', 'success');
    },

    encodeWav(buffer) {
      const numChannels = buffer.numberOfChannels;
      const sampleRate = buffer.sampleRate;
      const format = 1; // PCM
      const bitDepth = 16;

      const bytesPerSample = bitDepth / 8;
      const blockAlign = numChannels * bytesPerSample;

      const numSamples = buffer.length;
      const byteRate = sampleRate * blockAlign;
      const dataSize = numSamples * blockAlign;
      const headerSize = 44;
      const totalSize = headerSize + dataSize;

      const arrayBuffer = new ArrayBuffer(totalSize);
      const view = new DataView(arrayBuffer);

      // Write WAV header
      const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
      view.setUint16(20, format, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitDepth, true);
      writeString(36, 'data');
      view.setUint32(40, dataSize, true);

      // Interleave samples
      let offset = 44;
      for (let i = 0; i < numSamples; i++) {
        for (let c = 0; c < numChannels; c++) {
          const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
          const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          view.setInt16(offset, intSample, true);
          offset += 2;
        }
      }

      return new Blob([arrayBuffer], { type: 'audio/wav' });
    }
  };

  window.Omnia.audioStudio = AudioStudioModule;
})();
