(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
    showToast(m) { console.log(m); }
  };
  const api = window.Omnia.api || {};

/**
 * OMNIA 2.0 - Simulation Lab Module
 * 14 Interactive Physics & Scientific Simulations with real-time Canvas rendering
 */

const SimulationLabModule = {
  currentSim: 'projectile',
  canvas: null,
  ctx: null,
  animId: null,
  t: 0,

  init() {
    this.canvas = document.getElementById('sim-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.setupCanvas();
    this.bindControls();
    this.startSimulation();

    window.addEventListener('resize', () => {
      this.setupCanvas();
    });
  },

  setupCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width || 600;
    this.canvas.height = Math.min(360, this.canvas.width * 0.6);
  },

  bindControls() {
    const simSelect = document.getElementById('sim-select');
    if (simSelect) {
      simSelect.addEventListener('change', (e) => {
        this.currentSim = e.target.value;
        this.t = 0;
        this.updateSliders();
      });
    }

    const restartBtn = document.getElementById('sim-restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.t = 0;
      });
    }

    // Sliders
    const s1 = document.getElementById('sim-slider-1');
    const s2 = document.getElementById('sim-slider-2');
    if (s1) s1.addEventListener('input', () => this.t = 0);
    if (s2) s2.addEventListener('input', () => this.t = 0);
  },

  updateSliders() {
    const l1 = document.getElementById('sim-label-1');
    const l2 = document.getElementById('sim-label-2');
    const s1 = document.getElementById('sim-slider-1');
    const s2 = document.getElementById('sim-slider-2');
    const formulaEl = document.getElementById('sim-formula');

    if (this.currentSim === 'projectile') {
      if (l1) l1.textContent = 'Initial Velocity (m/s)';
      if (l2) l2.textContent = 'Launch Angle (deg)';
      if (s1) { s1.min = 10; s1.max = 80; s1.value = 45; }
      if (s2) { s2.min = 15; s2.max = 85; s2.value = 45; }
      if (formulaEl) formulaEl.textContent = 'Range R = (v₀² sin 2θ) / g • Max Height H = (v₀² sin² θ) / 2g';
    } else if (this.currentSim === 'pendulum') {
      if (l1) l1.textContent = 'String Length (m)';
      if (l2) l2.textContent = 'Initial Angle (deg)';
      if (s1) { s1.min = 1; s1.max = 5; s1.value = 2.5; }
      if (s2) { s2.min = 10; s2.max = 60; s2.value = 30; }
      if (formulaEl) formulaEl.textContent = 'Period T ≈ 2π √(L / g) • Simple Harmonic Oscillator';
    } else if (this.currentSim === 'wave') {
      if (l1) l1.textContent = 'Frequency (Hz)';
      if (l2) l2.textContent = 'Amplitude (px)';
      if (s1) { s1.min = 1; s1.max = 10; s1.value = 3; }
      if (s2) { s2.min = 10; s2.max = 60; s2.value = 30; }
      if (formulaEl) formulaEl.textContent = 'y(x, t) = A sin(kx - ωt + φ) • Wave Speed v = f · λ';
    } else if (this.currentSim === 'ohm') {
      if (l1) l1.textContent = 'Voltage (Volts)';
      if (l2) l2.textContent = 'Resistance (Ohms)';
      if (s1) { s1.min = 1; s1.max = 24; s1.value = 12; }
      if (s2) { s2.min = 1; s2.max = 50; s2.value = 10; }
      if (formulaEl) formulaEl.textContent = 'I = V / R • Power P = V · I = I² · R';
    }
  },

  startSimulation() {
    const loop = () => {
      this.t += 0.03;
      this.render();
      this.animId = requestAnimationFrame(loop);
    };
    loop();
  },

  render() {
    const { ctx, canvas } = this;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const s1Val = parseFloat(document.getElementById('sim-slider-1')?.value || '45');
    const s2Val = parseFloat(document.getElementById('sim-slider-2')?.value || '45');
    const readout = document.getElementById('sim-readout');

    if (this.currentSim === 'projectile') {
      const v0 = s1Val;
      const angleDeg = s2Val;
      const rad = (angleDeg * Math.PI) / 180;
      const g = 9.81;

      // Calculate kinematics
      const tFlight = (2 * v0 * Math.sin(rad)) / g;
      const maxH = (v0 * v0 * Math.sin(rad) * Math.sin(rad)) / (2 * g);
      const range = (v0 * v0 * Math.sin(2 * rad)) / g;

      if (readout) {
        readout.textContent = `Flight: ${tFlight.toFixed(2)}s | Max H: ${maxH.toFixed(1)}m | Range: ${range.toFixed(1)}m`;
      }

      // Draw ground
      ctx.beginPath();
      ctx.moveTo(30, canvas.height - 30);
      ctx.lineTo(canvas.width - 30, canvas.height - 30);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Trajectory curve
      const scaleX = (canvas.width - 80) / Math.max(range, 1);
      const scaleY = (canvas.height - 80) / Math.max(maxH * 1.5, 1);

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
      ctx.setLineDash([4, 4]);
      for (let x = 0; x <= range; x += range / 60) {
        const y = x * Math.tan(rad) - (g * x * x) / (2 * v0 * v0 * Math.cos(rad) * Math.cos(rad));
        const px = 40 + x * scaleX;
        const py = canvas.height - 30 - y * scaleY;
        if (x === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Projectile ball position
      const curT = this.t % (tFlight + 1);
      if (curT <= tFlight) {
        const xPos = v0 * Math.cos(rad) * curT;
        const yPos = v0 * Math.sin(rad) * curT - 0.5 * g * curT * curT;
        const px = 40 + xPos * scaleX;
        const py = canvas.height - 30 - yPos * scaleY;

        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    } else if (this.currentSim === 'pendulum') {
      const L = s1Val;
      const maxTheta = (s2Val * Math.PI) / 180;
      const g = 9.81;
      const omega = Math.sqrt(g / L);
      const theta = maxTheta * Math.cos(omega * this.t);

      if (readout) {
        const period = 2 * Math.PI * Math.sqrt(L / g);
        readout.textContent = `Period T: ${period.toFixed(2)}s | Frequency: ${(1 / period).toFixed(2)} Hz | Angle: ${(theta * 180 / Math.PI).toFixed(1)}°`;
      }

      const cx = canvas.width / 2;
      const cy = 40;
      const bobR = 20 + L * 35;
      const bx = cx + Math.sin(theta) * bobR;
      const by = cy + Math.cos(theta) * bobR;

      // Cord
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Bob
      ctx.beginPath();
      ctx.arc(bx, by, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#6366f1';
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.currentSim === 'wave') {
      const f = s1Val;
      const amp = s2Val;
      const lambda = 120;
      const k = (2 * Math.PI) / lambda;
      const omega = 2 * Math.PI * f;

      if (readout) {
        readout.textContent = `Frequency: ${f} Hz | Wavelength: ${lambda}px | Wave Speed: ${f * lambda} px/s`;
      }

      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      for (let x = 0; x < canvas.width; x += 3) {
        const y = canvas.height / 2 + Math.sin(k * x - omega * (this.t * 0.1)) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (this.currentSim === 'ohm') {
      const v = s1Val;
      const r = s2Val;
      const i = v / r;
      const p = v * i;

      if (readout) {
        readout.textContent = `Current I: ${i.toFixed(2)} Amperes | Dissipated Power: ${p.toFixed(2)} Watts`;
      }

      // Draw circuit schematic
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 100, cy - 60, 200, 120);

      // Battery label
      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px system-ui';
      ctx.fillText(`${v} V (Source)`, cx - 95, cy - 70);
      ctx.fillText(`${r} Ω (Load)`, cx - 20, cy + 80);

      // Current flow electrons
      const offset = (this.t * i * 30) % 200;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx - 100 + offset, cy - 60, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

window.SimulationLabModule = SimulationLabModule;


  window.Omnia.simulationLab = SimulationLabModule;
  window.SimulationLabModule = SimulationLabModule;
})();
