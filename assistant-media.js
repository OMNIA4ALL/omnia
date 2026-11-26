/**
 * OMNIA 2.0 — OMNIA Intelligence Multimodal Input Controls
 * Supports:
 * - Image upload with preview & removal (PNG/JPEG/WebP, max 3 MB, never auto-uploaded)
 * - Microphone speech-to-text (Web Speech API) + optional text-to-speech (speechSynthesis)
 * - Camera still capture (explicit user start/capture/stop)
 * - Live camera video analysis via user-controlled frame sampling (never continuous hidden streaming)
 * - Live screen sharing via getDisplayMedia + user-controlled frame sampling
 * - Automatic media track cleanup on Stop, panel close, or navigation away from #assistant
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    showToast(m) { console.log(m); }
  };

  const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB
  const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

  const AssistantMediaModule = {
    initialized: false,
    pendingImage: null, // { dataUrl, name, sizeBytes, source }
    activeStream: null,
    activeMode: null, // 'camera-still' | 'camera-live' | 'screen-live' | null
    isPaused: false,
    recognition: null,
    isRecording: false,
    ttsEnabled: false,
    onAttachmentChangeCb: null,

    init() {
      if (this.initialized) return;
      this.initialized = true;
      this.bindControls();
      this.bindSafetyCleanup();
    },

    onAttachmentChange(cb) {
      this.onAttachmentChangeCb = cb;
    },

    getPendingImage() {
      return this.pendingImage;
    },

    clearPendingImage() {
      this.pendingImage = null;
      const previewWrap = document.getElementById('assistant-attachment-preview');
      const fileInput = document.getElementById('assistant-image-input');
      if (previewWrap) {
        previewWrap.classList.add('hidden');
        previewWrap.innerHTML = '';
      }
      if (fileInput) fileInput.value = '';
      if (this.onAttachmentChangeCb) this.onAttachmentChangeCb(null);
    },

    setPendingImage(dataUrl, name, sizeBytes, source = 'upload') {
      this.pendingImage = { dataUrl, name, sizeBytes, source };
      const previewWrap = document.getElementById('assistant-attachment-preview');
      if (previewWrap) {
        previewWrap.innerHTML = '';
        previewWrap.classList.remove('hidden');

        const card = document.createElement('div');
        card.className = 'flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-900/90 border border-indigo-500/30';

        const left = document.createElement('div');
        left.className = 'flex items-center gap-2.5 min-w-0';

        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = 'Attached image preview';
        img.className = 'w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0';

        const meta = document.createElement('div');
        meta.className = 'min-w-0';
        const title = document.createElement('div');
        title.className = 'text-xs font-medium text-slate-200 truncate';
        title.textContent = name || 'Attached image';
        const sub = document.createElement('div');
        sub.className = 'text-[10.5px] text-slate-400';
        const kb = Math.max(1, Math.round((sizeBytes || dataUrl.length * 0.75) / 1024));
        sub.textContent = `${kb} KB • Ready to send when you click Ask AI (requires vision model)`;
        meta.appendChild(title);
        meta.appendChild(sub);

        left.appendChild(img);
        left.appendChild(meta);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-medium shrink-0';
        removeBtn.textContent = 'Remove';
        removeBtn.setAttribute('aria-label', 'Remove attached image');
        removeBtn.addEventListener('click', () => this.clearPendingImage());

        card.appendChild(left);
        card.appendChild(removeBtn);
        previewWrap.appendChild(card);
      }

      if (this.onAttachmentChangeCb) this.onAttachmentChangeCb(this.pendingImage);
    },

    bindControls() {
      // 1. Image upload
      const imgBtn = document.getElementById('assistant-img-upload-btn');
      const imgInput = document.getElementById('assistant-image-input');
      imgBtn?.addEventListener('click', () => imgInput?.click());
      imgInput?.addEventListener('change', () => {
        const file = imgInput.files?.[0];
        if (!file) return;
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          storage.showToast('Unsupported image format. Please use PNG, JPEG, or WebP.', 'warning');
          imgInput.value = '';
          return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          storage.showToast('Image exceeds 3 MB limit. Please select a smaller image.', 'warning');
          imgInput.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            this.setPendingImage(reader.result, file.name, file.size, 'upload');
          }
        };
        reader.readAsDataURL(file);
      });

      // 2. Microphone Speech-to-Text
      const micBtn = document.getElementById('assistant-mic-btn');
      const micCancelBtn = document.getElementById('assistant-mic-cancel-btn');
      micBtn?.addEventListener('click', () => {
        if (this.isRecording) this.stopVoiceInput(false);
        else this.startVoiceInput();
      });
      micCancelBtn?.addEventListener('click', () => this.stopVoiceInput(true));

      // 3. Text-to-Speech toggle & stop
      const ttsBtn = document.getElementById('assistant-tts-toggle-btn');
      const ttsStopBtn = document.getElementById('assistant-tts-stop-btn');
      ttsBtn?.addEventListener('click', () => {
        if (!('speechSynthesis' in window)) {
          storage.showToast('Text-to-speech is not supported in this browser.', 'warning');
          return;
        }
        this.ttsEnabled = !this.ttsEnabled;
        ttsBtn.setAttribute('aria-pressed', this.ttsEnabled ? 'true' : 'false');
        ttsBtn.classList.toggle('bg-indigo-600', this.ttsEnabled);
        ttsBtn.classList.toggle('text-white', this.ttsEnabled);
        if (!this.ttsEnabled) this.stopSpeaking();
        storage.showToast(this.ttsEnabled ? 'Voice readout enabled for AI replies.' : 'Voice readout muted.', 'info');
      });
      ttsStopBtn?.addEventListener('click', () => this.stopSpeaking());

      // 4. Camera Capture (still)
      document.getElementById('assistant-camera-btn')?.addEventListener('click', () => {
        this.startMediaSession('camera-still');
      });

      // 5. Live Camera Video Analysis (user-controlled frame sampling)
      document.getElementById('assistant-live-cam-btn')?.addEventListener('click', () => {
        this.startMediaSession('camera-live');
      });

      // 6. Live Screen Sharing (user-controlled frame sampling)
      document.getElementById('assistant-screen-btn')?.addEventListener('click', () => {
        this.startMediaSession('screen-live');
      });

      // Active media panel controls
      document.getElementById('assistant-media-pause-btn')?.addEventListener('click', () => this.togglePause());
      document.getElementById('assistant-media-capture-btn')?.addEventListener('click', () => this.captureFrameToAttachment(false));
      document.getElementById('assistant-media-stop-btn')?.addEventListener('click', () => this.stopMediaSession());
    },

    startVoiceInput() {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      const statusBar = document.getElementById('assistant-voice-status');
      if (!SpeechRec) {
        storage.showToast('Speech recognition is not supported in this browser. Please type your message instead.', 'warning');
        return;
      }

      try {
        const rec = new SpeechRec();
        rec.lang = navigator.language || 'en-US';
        rec.interimResults = true;
        rec.continuous = false;
        this.recognition = rec;
        this.isRecording = true;

        const inputEl = document.getElementById('assistant-command-input');
        const baseText = (inputEl?.value || '').trim();
        const micBtn = document.getElementById('assistant-mic-btn');
        if (micBtn) {
          micBtn.classList.add('bg-rose-600', 'text-white');
          micBtn.setAttribute('aria-pressed', 'true');
        }
        statusBar?.classList.remove('hidden');

        rec.onresult = (event) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (inputEl) {
            inputEl.value = baseText ? `${baseText} ${transcript.trim()}` : transcript.trim();
          }
        };

        rec.onerror = (ev) => {
          const msg = ev.error === 'not-allowed'
            ? 'Microphone permission denied. Allow microphone access or type your prompt.'
            : `Voice input error (${ev.error}). You can type your prompt instead.`;
          storage.showToast(msg, 'warning');
          this.stopVoiceInput(false);
        };

        rec.onend = () => {
          this.isRecording = false;
          if (micBtn) {
            micBtn.classList.remove('bg-rose-600', 'text-white');
            micBtn.setAttribute('aria-pressed', 'false');
          }
          statusBar?.classList.add('hidden');
          inputEl?.focus();
        };

        rec.start();
      } catch (e) {
        storage.showToast('Unable to start microphone input in this browser.', 'warning');
        this.stopVoiceInput(false);
      }
    },

    stopVoiceInput(clearInput = false) {
      if (this.recognition) {
        try { this.recognition.stop(); } catch {}
        this.recognition = null;
      }
      this.isRecording = false;
      const micBtn = document.getElementById('assistant-mic-btn');
      if (micBtn) {
        micBtn.classList.remove('bg-rose-600', 'text-white');
        micBtn.setAttribute('aria-pressed', 'false');
      }
      document.getElementById('assistant-voice-status')?.classList.add('hidden');
      if (clearInput) {
        const inputEl = document.getElementById('assistant-command-input');
        if (inputEl) inputEl.value = '';
      }
    },

    speakText(text) {
      if (!this.ttsEnabled || !('speechSynthesis' in window) || !text) return;
      try {
        window.speechSynthesis.cancel();
        const plain = text.replace(/[*`#_]/g, '').slice(0, 1200);
        const utter = new SpeechSynthesisUtterance(plain);
        const stopBtn = document.getElementById('assistant-tts-stop-btn');
        utter.onstart = () => stopBtn?.classList.remove('hidden');
        utter.onend = () => stopBtn?.classList.add('hidden');
        utter.onerror = () => stopBtn?.classList.add('hidden');
        window.speechSynthesis.speak(utter);
      } catch {}
    },

    stopSpeaking() {
      if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
      document.getElementById('assistant-tts-stop-btn')?.classList.add('hidden');
    },

    async startMediaSession(mode) {
      // Stop any existing stream first
      this.stopMediaSession();

      if (mode === 'screen-live') {
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
          storage.showToast('Live screen sharing is not supported on this browser/device (most mobile browsers restrict getDisplayMedia).', 'warning');
          return;
        }
      } else {
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
          storage.showToast('Camera access is not supported in this browser.', 'warning');
          return;
        }
      }

      try {
        const stream = mode === 'screen-live'
          ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
          : await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });

        this.activeStream = stream;
        this.activeMode = mode;
        this.isPaused = false;

        const videoEl = document.getElementById('assistant-media-video');
        const panelEl = document.getElementById('assistant-media-panel');
        const badgeEl = document.getElementById('assistant-media-badge');
        const noteEl = document.getElementById('assistant-media-note');
        const captureBtn = document.getElementById('assistant-media-capture-btn');

        if (videoEl) {
          videoEl.srcObject = stream;
          videoEl.play().catch(() => {});
        }
        panelEl?.classList.remove('hidden');

        if (badgeEl) {
          badgeEl.textContent = mode === 'screen-live'
            ? '● SHARING SCREEN'
            : mode === 'camera-live'
            ? '● LIVE CAMERA (FRAME SAMPLING)'
            : '● CAMERA PREVIEW';
        }
        if (noteEl) {
          noteEl.textContent = mode === 'camera-still'
            ? 'Capture a still photo to preview it before sending to your personal Cloudflare Worker.'
            : 'Frames are NEVER sent continuously or automatically. Click "Capture Frame to Preview" whenever you want to sample a frame and submit it with your question.';
        }
        if (captureBtn) {
          captureBtn.textContent = mode === 'camera-still' ? '📸 Capture Photo' : '📸 Capture Frame to Preview';
        }

        // Stop cleanly if user ends sharing via browser chrome
        stream.getVideoTracks().forEach(track => {
          track.addEventListener('ended', () => this.stopMediaSession());
        });
      } catch (err) {
        const msg = err?.name === 'NotAllowedError'
          ? 'Permission declined. Camera/screen access is only activated when you allow it.'
          : 'Unable to start camera or screen capture.';
        storage.showToast(msg, 'warning');
        this.stopMediaSession();
      }
    },

    togglePause() {
      const videoEl = document.getElementById('assistant-media-video');
      const pauseBtn = document.getElementById('assistant-media-pause-btn');
      if (!videoEl || !this.activeStream) return;
      this.isPaused = !this.isPaused;
      if (this.isPaused) {
        videoEl.pause();
        if (pauseBtn) pauseBtn.textContent = '▶ Resume';
      } else {
        videoEl.play().catch(() => {});
        if (pauseBtn) pauseBtn.textContent = '⏸ Pause';
      }
    },

    captureFrameToAttachment() {
      const videoEl = document.getElementById('assistant-media-video');
      if (!videoEl || !this.activeStream || videoEl.videoWidth === 0) {
        storage.showToast('Video preview is not ready yet.', 'warning');
        return;
      }

      const maxDim = 1024;
      let w = videoEl.videoWidth;
      let h = videoEl.videoHeight;
      if (w > maxDim || h > maxDim) {
        const scale = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

      const label = this.activeMode === 'screen-live'
        ? `screen-frame-${Date.now()}.jpg`
        : `camera-frame-${Date.now()}.jpg`;
      this.setPendingImage(dataUrl, label, Math.round(dataUrl.length * 0.75), this.activeMode);
      storage.showToast('Snapshot captured! Review preview and click Ask AI to send.', 'success');

      // For still camera mode, stop camera immediately after capture
      if (this.activeMode === 'camera-still') {
        this.stopMediaSession();
      }
    },

    stopMediaSession() {
      if (this.activeStream) {
        this.activeStream.getTracks().forEach(t => {
          try { t.stop(); } catch {}
        });
        this.activeStream = null;
      }
      this.activeMode = null;
      this.isPaused = false;
      const videoEl = document.getElementById('assistant-media-video');
      if (videoEl) videoEl.srcObject = null;
      document.getElementById('assistant-media-panel')?.classList.add('hidden');
      const pauseBtn = document.getElementById('assistant-media-pause-btn');
      if (pauseBtn) pauseBtn.textContent = '⏸ Pause';
    },

    bindSafetyCleanup() {
      window.addEventListener('hashchange', () => {
        const sec = (window.location.hash || '').replace(/^#/, '');
        if (sec !== 'assistant') {
          this.stopMediaSession();
          this.stopVoiceInput(false);
          this.stopSpeaking();
        }
      });
      window.addEventListener('pagehide', () => {
        this.stopMediaSession();
        this.stopVoiceInput(false);
        this.stopSpeaking();
      });
    }
  };

  window.Omnia.assistantMedia = AssistantMediaModule;
})();
