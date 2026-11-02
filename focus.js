/**
 * OMNIA Focus & Productivity Module
 * Timestamp-based Pomodoro timer (drift-free), stopwatch with laps, countdown, and Web Audio synthesizer.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage;

  const focus = {
    // Pomodoro State
    pomoRemaining: 25 * 60,
    pomoTotal: 25 * 60,
    pomoTimer: null,
    pomoEndTime: null,
    pomoMode: 'work',

    // Stopwatch State
    swElapsed: 0,
    swTimer: null,
    swStartTime: null,
    swLaps: [],

    // Countdown State
    cdRemaining: 600,
    cdTimer: null,
    cdEndTime: null,

    // Web Audio State
    audioCtx: null,
    soundNodes: {},

    init() {
      this.initPomodoro();
      this.initStopwatch();
      this.initCountdown();
      this.initZenMode();
      this.initAmbientAudio();
    },

    // ==========================================
    // 1. POMODORO TIMER (TIMESTAMP-BASED)
    // ==========================================
    initPomodoro() {
      const display = document.getElementById('pomo-display');
      const ring = document.getElementById('pomo-progress-ring');
      const stateTxt = document.getElementById('pomo-state-text');

      const updateUI = () => {
        const m = Math.floor(this.pomoRemaining / 60);
        const s = this.pomoRemaining % 60;
        if (display) display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

        if (ring) {
          const circumference = 264;
          const offset = circumference - (this.pomoRemaining / this.pomoTotal) * circumference;
          ring.style.strokeDashoffset = offset;
        }
      };

      const start = () => {
        if (this.pomoTimer) return;
        this.pomoEndTime = Date.now() + this.pomoRemaining * 1000;
        this.pomoTimer = setInterval(() => {
          const now = Date.now();
          const diff = Math.max(0, Math.round((this.pomoEndTime - now) / 1000));
          this.pomoRemaining = diff;
          updateUI();

          if (diff <= 0) {
            clearInterval(this.pomoTimer);
            this.pomoTimer = null;
            this.pomoEndTime = null;
            this.playChime();
            storage.showToast('Pomodoro session completed!', 'success');
          }
        }, 500);
      };

      const pause = () => {
        if (this.pomoTimer) {
          clearInterval(this.pomoTimer);
          this.pomoTimer = null;
          this.pomoEndTime = null;
        }
      };

      const reset = (secs = this.pomoTotal) => {
        pause();
        this.pomoRemaining = secs;
        updateUI();
      };

      document.getElementById('pomo-start-btn')?.addEventListener('click', start);
      document.getElementById('pomo-pause-btn')?.addEventListener('click', pause);
      document.getElementById('pomo-reset-btn')?.addEventListener('click', () => reset());

      document.getElementById('pomo-mode-work')?.addEventListener('click', () => {
        pause();
        this.pomoTotal = 25 * 60;
        this.pomoRemaining = this.pomoTotal;
        this.pomoMode = 'work';
        if (stateTxt) stateTxt.textContent = 'Deep Work';
        reset(25 * 60);
      });

      document.getElementById('pomo-mode-short')?.addEventListener('click', () => {
        pause();
        this.pomoTotal = 5 * 60;
        this.pomoRemaining = this.pomoTotal;
        this.pomoMode = 'short';
        if (stateTxt) stateTxt.textContent = 'Short Break';
        reset(5 * 60);
      });

      document.getElementById('pomo-mode-long')?.addEventListener('click', () => {
        pause();
        this.pomoTotal = 15 * 60;
        this.pomoRemaining = this.pomoTotal;
        this.pomoMode = 'long';
        if (stateTxt) stateTxt.textContent = 'Long Break';
        reset(15 * 60);
      });

      updateUI();
    },

    // ==========================================
    // 2. PRECISION STOPWATCH
    // ==========================================
    initStopwatch() {
      const display = document.getElementById('sw-display');
      const lapsBox = document.getElementById('sw-laps-box');
      const startBtn = document.getElementById('sw-start-btn');

      const updateUI = () => {
        if (!display) return;
        const totalCs = Math.floor(this.swElapsed / 10);
        const cs = totalCs % 100;
        const s = Math.floor(this.swElapsed / 1000) % 60;
        const m = Math.floor(this.swElapsed / 60000) % 60;
        const h = Math.floor(this.swElapsed / 3600000);
        display.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
      };

      startBtn?.addEventListener('click', () => {
        if (!this.swTimer) {
          this.swStartTime = Date.now() - this.swElapsed;
          this.swTimer = setInterval(() => {
            this.swElapsed = Date.now() - this.swStartTime;
            updateUI();
          }, 25);
          startBtn.textContent = 'Pause';
        } else {
          clearInterval(this.swTimer);
          this.swTimer = null;
          this.swStartTime = null;
          startBtn.textContent = 'Resume';
        }
      });

      document.getElementById('sw-lap-btn')?.addEventListener('click', () => {
        if (this.swElapsed === 0) return;
        this.swLaps.unshift(display ? display.textContent : '');
        if (lapsBox) {
          lapsBox.innerHTML = this.swLaps.map((lap, i) => `
            <div class="flex justify-between py-1 border-b border-white/5">
              <span class="text-slate-400">Lap ${this.swLaps.length - i}</span>
              <span class="text-slate-200 font-bold">${lap}</span>
            </div>
          `).join('');
        }
      });

      document.getElementById('sw-reset-btn')?.addEventListener('click', () => {
        if (this.swTimer) { clearInterval(this.swTimer); this.swTimer = null; }
        this.swElapsed = 0;
        this.swStartTime = null;
        this.swLaps = [];
        updateUI();
        if (startBtn) startBtn.textContent = 'Start';
        if (lapsBox) lapsBox.innerHTML = '<div class="text-slate-500 text-center py-4">No laps recorded</div>';
      });

      updateUI();
    },

    // ==========================================
    // 3. COUNTDOWN TIMER
    // ==========================================
    initCountdown() {
      const display = document.getElementById('cd-display');
      const status = document.getElementById('cd-status');

      const updateUI = () => {
        const h = Math.floor(this.cdRemaining / 3600);
        const m = Math.floor((this.cdRemaining % 3600) / 60);
        const s = this.cdRemaining % 60;
        if (display) display.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      };

      document.getElementById('cd-start-btn')?.addEventListener('click', () => {
        if (this.cdTimer) return;
        if (status) status.textContent = 'Running';
        this.cdEndTime = Date.now() + this.cdRemaining * 1000;
        this.cdTimer = setInterval(() => {
          const now = Date.now();
          const diff = Math.max(0, Math.round((this.cdEndTime - now) / 1000));
          this.cdRemaining = diff;
          updateUI();

          if (diff <= 0) {
            clearInterval(this.cdTimer);
            this.cdTimer = null;
            this.cdEndTime = null;
            if (status) status.textContent = 'Time Up!';
            this.playChime();
            storage.showToast('Countdown finished!', 'success');
          }
        }, 500);
      });

      document.getElementById('cd-pause-btn')?.addEventListener('click', () => {
        if (this.cdTimer) {
          clearInterval(this.cdTimer);
          this.cdTimer = null;
          this.cdEndTime = null;
          if (status) status.textContent = 'Paused';
        }
      });

      document.getElementById('cd-reset-btn')?.addEventListener('click', () => {
        if (this.cdTimer) { clearInterval(this.cdTimer); this.cdTimer = null; }
        this.cdRemaining = 600;
        this.cdEndTime = null;
        if (status) status.textContent = 'Idle';
        updateUI();
      });

      document.querySelectorAll('.cd-preset').forEach(btn => {
        btn.addEventListener('click', () => {
          if (this.cdTimer) { clearInterval(this.cdTimer); this.cdTimer = null; }
          this.cdRemaining = parseInt(btn.getAttribute('data-secs'));
          if (status) status.textContent = 'Ready';
          updateUI();
        });
      });

      updateUI();
    },

    // ==========================================
    // 4. ZEN FOCUS MODE
    // ==========================================
    initZenMode() {
      const overlay = document.getElementById('zen-overlay');
      document.getElementById('focus-launch-zen-btn')?.addEventListener('click', () => {
        if (overlay) { overlay.classList.remove('hidden'); try { window.history.pushState({ modal: 'zen-overlay' }, '', window.location.hash); } catch (err) {} }
      });
      document.getElementById('exit-zen-btn')?.addEventListener('click', () => {
        if (overlay) overlay.classList.add('hidden');
      });

      // 4-7-8 Breathing Guide Loop
      let breathSec = 0;
      const breathPhase = document.getElementById('zen-phase-text');
      setInterval(() => {
        if (overlay && !overlay.classList.contains('hidden') && breathPhase) {
          breathSec = (breathSec + 1) % 19;
          if (breathSec < 4) breathPhase.textContent = 'Inhale slowly...';
          else if (breathSec < 11) breathPhase.textContent = 'Hold breath gently...';
          else breathPhase.textContent = 'Exhale deeply...';
        }
      }, 1000);
    },

    // ==========================================
    // 5. WEB AUDIO AMBIENT SOUND SYNTHESIZER
    // ==========================================
    getAudioContext() {
      if (!this.audioCtx) {
        const AudioC = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioC();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    },

    playChime() {
      try {
        const ctx = this.getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      } catch (e) {}
    },

    createNoiseBuffer(ctx, type = 'white') {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'pink') {
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        } else {
          data[i] = white;
        }
      }
      return buffer;
    },

    toggleAmbientSound(soundName) {
      const ctx = this.getAudioContext();
      const btn = document.getElementById(`amb-btn-${soundName}`);

      if (this.soundNodes[soundName]) {
        try {
          this.soundNodes[soundName].source.stop();
          this.soundNodes[soundName].gain.disconnect();
        } catch (e) {}
        delete this.soundNodes[soundName];
        if (btn) {
          btn.textContent = 'Play';
          btn.classList.remove('bg-blue-600', 'text-white');
          btn.classList.add('bg-slate-800', 'text-slate-300');
        }
        storage.showToast(`Stopped ${soundName} audio`);
        return;
      }

      try {
        const gainNode = ctx.createGain();
        const volEl = document.getElementById(`amb-vol-${soundName}`);
        gainNode.gain.setValueAtTime(volEl ? parseFloat(volEl.value) : 0.3, ctx.currentTime);

        let sourceNode;
        if (soundName === 'binaural') {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(432, ctx.currentTime);
          osc2.frequency.setValueAtTime(436, ctx.currentTime);
          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc1.start();
          osc2.start();
          sourceNode = { stop: () => { osc1.stop(); osc2.stop(); } };
        } else {
          const isPink = soundName === 'pink' || soundName === 'waves';
          const noiseBuffer = this.createNoiseBuffer(ctx, isPink ? 'pink' : 'white');
          const noiseSrc = ctx.createBufferSource();
          noiseSrc.buffer = noiseBuffer;
          noiseSrc.loop = true;

          if (soundName === 'rain') {
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000, ctx.currentTime);
            filter.Q.setValueAtTime(1.2, ctx.currentTime);
            noiseSrc.connect(filter);
            filter.connect(gainNode);
          } else if (soundName === 'waves') {
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, ctx.currentTime);
            noiseSrc.connect(filter);
            filter.connect(gainNode);
          } else {
            noiseSrc.connect(gainNode);
          }

          gainNode.connect(ctx.destination);
          noiseSrc.start();
          sourceNode = noiseSrc;
        }

        this.soundNodes[soundName] = { source: sourceNode, gain: gainNode };
        if (btn) {
          btn.textContent = 'Active';
          btn.classList.add('bg-blue-600', 'text-white');
          btn.classList.remove('bg-slate-800', 'text-slate-300');
        }
        storage.showToast(`Playing ${soundName} synthesized ambience`, 'success');
      } catch (e) {
        storage.showToast('Audio synthesis error: ' + e.message, 'error');
      }
    },

    initAmbientAudio() {
      document.querySelectorAll('.amb-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.toggleAmbientSound(btn.getAttribute('data-sound'));
        });
      });

      ['rain', 'waves', 'white', 'pink', 'binaural'].forEach(name => {
        document.getElementById(`amb-vol-${name}`)?.addEventListener('input', (e) => {
          if (this.soundNodes[name] && this.soundNodes[name].gain && this.audioCtx) {
            this.soundNodes[name].gain.gain.setValueAtTime(parseFloat(e.target.value), this.audioCtx.currentTime);
          }
        });
      });

      document.getElementById('ambient-master-mute-btn')?.addEventListener('click', () => {
        Object.keys(this.soundNodes).forEach(k => this.toggleAmbientSound(k));
        storage.showToast('All ambient audio muted');
      });
    }
  };

  window.Omnia.focus = focus;
})();
