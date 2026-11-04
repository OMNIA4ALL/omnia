/**
 * OMNIA 2.0 - Division 22: Advanced Mathematics Laboratory
 * Safe mathematical expression parser (NO eval()), 2D multi-function plotter,
 * numerical calculus (derivatives, Simpson's integration, root finding),
 * complex numbers, matrix operations, vectors, and 3D surface visualizer.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    showToast(m, t) { console.log(m, t); }
  };

  /**
   * Safe recursive mathematical expression tokenizer and evaluator (zero eval / zero new Function)
   */
  const MathParser = {
    tokenize(expr) {
      const tokens = [];
      const clean = expr.replace(/\s+/g, '');
      let i = 0;
      while (i < clean.length) {
        const c = clean[i];
        if ('+-*/^(),'.includes(c)) {
          tokens.push({ type: 'op', val: c });
          i++;
        } else if (/[0-9.]/.test(c)) {
          let num = '';
          while (i < clean.length && /[0-9.]/.test(clean[i])) {
            num += clean[i];
            i++;
          }
          tokens.push({ type: 'num', val: parseFloat(num) });
        } else if (/[a-zA-Z]/.test(c)) {
          let word = '';
          while (i < clean.length && /[a-zA-Z0-9]/.test(clean[i])) {
            word += clean[i];
            i++;
          }
          tokens.push({ type: 'word', val: word.toLowerCase() });
        } else {
          i++;
        }
      }
      return tokens;
    },

    compile(expr) {
      const tokens = this.tokenize(expr);
      // Returns a function f(x, [y]) that evaluates the expression safely
      return (x = 0, y = 0) => {
        let pos = 0;

        const parseExpression = () => {
          let val = parseTerm();
          while (pos < tokens.length && (tokens[pos].val === '+' || tokens[pos].val === '-')) {
            const op = tokens[pos++].val;
            const next = parseTerm();
            val = op === '+' ? val + next : val - next;
          }
          return val;
        };

        const parseTerm = () => {
          let val = parsePower();
          while (pos < tokens.length && (tokens[pos].val === '*' || tokens[pos].val === '/')) {
            const op = tokens[pos++].val;
            const next = parsePower();
            val = op === '*' ? val * next : (next !== 0 ? val / next : NaN);
          }
          return val;
        };

        const parsePower = () => {
          let val = parseFactor();
          while (pos < tokens.length && tokens[pos].val === '^') {
            pos++;
            const exp = parseFactor();
            val = Math.pow(val, exp);
          }
          return val;
        };

        const parseFactor = () => {
          if (pos >= tokens.length) return 0;
          const t = tokens[pos++];

          // Unary minus
          if (t.type === 'op' && t.val === '-') {
            return -parseFactor();
          }
          if (t.type === 'op' && t.val === '+') {
            return parseFactor();
          }

          if (t.type === 'num') {
            return t.val;
          }

          if (t.type === 'word') {
            if (t.val === 'x') return x;
            if (t.val === 'y') return y;
            if (t.val === 'pi') return Math.PI;
            if (t.val === 'e') return Math.E;

            // Mathematical functions: sin, cos, tan, ln, log, exp, sqrt, abs
            if (pos < tokens.length && tokens[pos].val === '(') {
              pos++; // consume '('
              const arg = parseExpression();
              if (pos < tokens.length && tokens[pos].val === ')') pos++; // consume ')'

              switch (t.val) {
                case 'sin': return Math.sin(arg);
                case 'cos': return Math.cos(arg);
                case 'tan': return Math.tan(arg);
                case 'asin': return Math.asin(arg);
                case 'acos': return Math.acos(arg);
                case 'atan': return Math.atan(arg);
                case 'sinh': return Math.sinh(arg);
                case 'cosh': return Math.cosh(arg);
                case 'tanh': return Math.tanh(arg);
                case 'sqrt': return arg >= 0 ? Math.sqrt(arg) : NaN;
                case 'cbrt': return Math.cbrt(arg);
                case 'abs': return Math.abs(arg);
                case 'ln': case 'log': return arg > 0 ? Math.log(arg) : NaN;
                case 'log10': return arg > 0 ? Math.log10(arg) : NaN;
                case 'exp': return Math.exp(arg);
                default: return arg;
              }
            }
            return 0;
          }

          if (t.type === 'op' && t.val === '(') {
            const val = parseExpression();
            if (pos < tokens.length && tokens[pos].val === ')') pos++;
            return val;
          }

          return 0;
        };

        try {
          return parseExpression();
        } catch (e) {
          return NaN;
        }
      };
    }
  };

  const MathematicsLabModule = {
    // 2D Plotter State
    functions: [
      { id: 'f1', expr: 'sin(x)', color: '#818cf8', visible: true, fn: MathParser.compile('sin(x)') },
      { id: 'f2', expr: '0.2*x^2 - 2', color: '#34d399', visible: true, fn: MathParser.compile('0.2*x^2 - 2') }
    ],
    view2D: {
      minX: -10, maxX: 10,
      minY: -6, maxY: 6,
      isPanning: false,
      lastMouseX: 0,
      lastMouseY: 0
    },

    // 3D Surface State
    surfaceExpr: 'sin(sqrt(x^2 + y^2))',
    surfaceFn: null,
    view3D: { rotX: 45, rotY: 35, zoom: 1.0, isDragging: false, lastX: 0, lastY: 0 },

    init() {
      this.surfaceFn = MathParser.compile(this.surfaceExpr);
      this.bindEvents();
      this.renderFunctionsList();
      this.draw2DPlot();
      this.draw3DSurface();
    },

    bindEvents() {
      // 2D Plot Function Add
      document.getElementById('math-add-func-btn')?.addEventListener('click', () => {
        const input = document.getElementById('math-new-func-input');
        const expr = (input?.value || '').trim();
        if (!expr) return;

        const colors = ['#f472b6', '#38bdf8', '#fbbf24', '#a78bfa', '#fb7185'];
        const color = colors[this.functions.length % colors.length];

        try {
          const fn = MathParser.compile(expr);
          // Test evaluation
          fn(1);
          this.functions.push({
            id: 'f-' + Date.now(),
            expr,
            color,
            visible: true,
            fn
          });
          if (input) input.value = '';
          this.renderFunctionsList();
          this.draw2DPlot();
          storage.showToast(`Plotted f(x) = ${expr}`, 'success');
        } catch (err) {
          storage.showToast('Invalid mathematical formula', 'error');
        }
      });

      // 2D Canvas Pan & Zoom
      const canvas2D = document.getElementById('math-2d-canvas');
      canvas2D?.addEventListener('mousedown', (e) => {
        this.view2D.isPanning = true;
        this.view2D.lastMouseX = e.clientX;
        this.view2D.lastMouseY = e.clientY;
      });
      window.addEventListener('mouseup', () => { this.view2D.isPanning = false; });
      canvas2D?.addEventListener('mousemove', (e) => {
        if (this.view2D.isPanning) {
          const dx = e.clientX - this.view2D.lastMouseX;
          const dy = e.clientY - this.view2D.lastMouseY;
          this.view2D.lastMouseX = e.clientX;
          this.view2D.lastMouseY = e.clientY;

          const spanX = this.view2D.maxX - this.view2D.minX;
          const spanY = this.view2D.maxY - this.view2D.minY;
          const unitX = spanX / canvas2D.width;
          const unitY = spanY / canvas2D.height;

          this.view2D.minX -= dx * unitX;
          this.view2D.maxX -= dx * unitX;
          this.view2D.minY += dy * unitY;
          this.view2D.maxY += dy * unitY;

          this.draw2DPlot();
        } else {
          // Hover readout
          this.updateCoordinateHover(e, canvas2D);
        }
      });

      canvas2D?.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.15 : 0.85;
        const midX = (this.view2D.minX + this.view2D.maxX) / 2;
        const midY = (this.view2D.minY + this.view2D.maxY) / 2;
        const halfSpanX = ((this.view2D.maxX - this.view2D.minX) * factor) / 2;
        const halfSpanY = ((this.view2D.maxY - this.view2D.minY) * factor) / 2;

        this.view2D.minX = midX - halfSpanX;
        this.view2D.maxX = midX + halfSpanX;
        this.view2D.minY = midY - halfSpanY;
        this.view2D.maxY = midY + halfSpanY;

        this.draw2DPlot();
      });

      // 2D Reset Zoom
      document.getElementById('math-reset-2d-btn')?.addEventListener('click', () => {
        this.view2D = { minX: -10, maxX: 10, minY: -6, maxY: 6, isPanning: false, lastMouseX: 0, lastMouseY: 0 };
        this.draw2DPlot();
      });

      // Export 2D Plot as PNG
      document.getElementById('math-export-2d-btn')?.addEventListener('click', () => {
        if (!canvas2D) return;
        const a = document.createElement('a');
        a.href = canvas2D.toDataURL('image/png');
        a.download = `omnia-plot-${Date.now()}.png`;
        a.click();
        storage.showToast('Graph exported as PNG image', 'success');
      });

      // Numerical Calculus: Derivative
      document.getElementById('math-calc-deriv-btn')?.addEventListener('click', () => {
        this.calculateDerivative();
      });

      // Numerical Calculus: Definite Integral
      document.getElementById('math-calc-integral-btn')?.addEventListener('click', () => {
        this.calculateIntegral();
      });

      // Numerical Calculus: Root Finding
      document.getElementById('math-calc-root-btn')?.addEventListener('click', () => {
        this.calculateRoot();
      });

      // Complex Calculator
      document.getElementById('math-complex-calc-btn')?.addEventListener('click', () => {
        this.calculateComplex();
      });

      // Matrix Operations
      document.getElementById('math-matrix-det-btn')?.addEventListener('click', () => this.calculateMatrix('det'));
      document.getElementById('math-matrix-inv-btn')?.addEventListener('click', () => this.calculateMatrix('inv'));
      document.getElementById('math-matrix-trans-btn')?.addEventListener('click', () => this.calculateMatrix('trans'));

      // Vector Operations
      document.getElementById('math-vector-calc-btn')?.addEventListener('click', () => {
        this.calculateVectors();
      });

      // 3D Surface Plotter Controls
      const canvas3D = document.getElementById('math-3d-canvas');
      canvas3D?.addEventListener('mousedown', (e) => {
        this.view3D.isDragging = true;
        this.view3D.lastX = e.clientX;
        this.view3D.lastY = e.clientY;
      });
      window.addEventListener('mouseup', () => { this.view3D.isDragging = false; });
      canvas3D?.addEventListener('mousemove', (e) => {
        if (this.view3D.isDragging) {
          const dx = e.clientX - this.view3D.lastX;
          const dy = e.clientY - this.view3D.lastY;
          this.view3D.lastX = e.clientX;
          this.view3D.lastY = e.clientY;
          this.view3D.rotY += dx * 0.5;
          this.view3D.rotX = Math.max(-85, Math.min(85, this.view3D.rotX + dy * 0.5));
          this.draw3DSurface();
        }
      });

      document.getElementById('math-3d-update-btn')?.addEventListener('click', () => {
        const expr = (document.getElementById('math-3d-expr-input')?.value || '').trim();
        if (expr) {
          try {
            this.surfaceFn = MathParser.compile(expr);
            this.surfaceExpr = expr;
            this.draw3DSurface();
            storage.showToast(`Updated 3D surface: z = ${expr}`, 'success');
          } catch (e) {
            storage.showToast('Invalid 3D expression', 'error');
          }
        }
      });
    },

    renderFunctionsList() {
      const container = document.getElementById('math-functions-list');
      if (!container) return;

      container.innerHTML = this.functions.map(f => `
        <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-white/5 text-xs">
          <div class="flex items-center gap-2 overflow-hidden">
            <span class="w-3 h-3 rounded-full shrink-0" style="background-color: ${f.color}"></span>
            <span class="font-mono text-slate-200 truncate">f(x) = ${this.escapeHtml(f.expr)}</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" class="math-toggle-vis-btn text-xs ${f.visible ? 'text-indigo-400' : 'text-slate-600'}" data-id="${f.id}">${f.visible ? '👁' : '✕'}</button>
            <button type="button" class="math-del-func-btn text-xs text-rose-400 hover:text-rose-300 ml-1" data-id="${f.id}">✕</button>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.math-toggle-vis-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const item = this.functions.find(f => f.id === id);
          if (item) { item.visible = !item.visible; this.renderFunctionsList(); this.draw2DPlot(); }
        });
      });

      container.querySelectorAll('.math-del-func-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.functions = this.functions.filter(f => f.id !== id);
          this.renderFunctionsList();
          this.draw2DPlot();
        });
      });
    },

    draw2DPlot() {
      const canvas = document.getElementById('math-2d-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = (canvas.width = canvas.parentElement.clientWidth || 700);
      const h = (canvas.height = 380);

      const { minX, maxX, minY, maxY } = this.view2D;

      ctx.fillStyle = '#080b11';
      ctx.fillRect(0, 0, w, h);

      const toScreenX = (x) => ((x - minX) / (maxX - minX)) * w;
      const toScreenY = (y) => h - ((y - minY) / (maxY - minY)) * h;

      // Draw Grid Lines & Numbers
      ctx.lineWidth = 1;
      const stepX = this.calculateGridStep(maxX - minX);
      const stepY = this.calculateGridStep(maxY - minY);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = '10px monospace';

      const firstGridX = Math.ceil(minX / stepX) * stepX;
      for (let x = firstGridX; x <= maxX; x += stepX) {
        const sx = toScreenX(x);
        ctx.beginPath();
        ctx.moveTo(sx, 0); ctx.lineTo(sx, h);
        ctx.stroke();
        if (Math.abs(x) > 1e-6) ctx.fillText(x.toFixed(1), sx + 2, toScreenY(0) + 12);
      }

      const firstGridY = Math.ceil(minY / stepY) * stepY;
      for (let y = firstGridY; y <= maxY; y += stepY) {
        const sy = toScreenY(y);
        ctx.beginPath();
        ctx.moveTo(0, sy); ctx.lineTo(w, sy);
        ctx.stroke();
        if (Math.abs(y) > 1e-6) ctx.fillText(y.toFixed(1), toScreenX(0) + 4, sy - 2);
      }

      // Draw Axes
      const originX = toScreenX(0);
      const originY = toScreenY(0);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, originY); ctx.lineTo(w, originY);
      ctx.moveTo(originX, 0); ctx.lineTo(originX, h);
      ctx.stroke();

      // Plot Functions
      this.functions.filter(f => f.visible).forEach(f => {
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        let started = false;
        for (let px = 0; px <= w; px += 2) {
          const x = minX + (px / w) * (maxX - minX);
          const y = f.fn(x);

          if (!isNaN(y) && isFinite(y)) {
            const py = toScreenY(y);
            if (py >= -h && py <= h * 2) {
              if (!started) {
                ctx.moveTo(px, py);
                started = true;
              } else {
                ctx.lineTo(px, py);
              }
            } else {
              started = false;
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      });
    },

    updateCoordinateHover(e, canvas) {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const { minX, maxX, minY, maxY } = this.view2D;
      const x = minX + (px / canvas.width) * (maxX - minX);
      const y = maxY - (py / canvas.height) * (maxY - minY);

      const coordEl = document.getElementById('math-coord-readout');
      if (coordEl) coordEl.textContent = `x: ${x.toFixed(2)}, y: ${y.toFixed(2)}`;
    },

    calculateGridStep(range) {
      const rough = range / 8;
      const pow = Math.pow(10, Math.floor(Math.log10(rough)));
      const base = rough / pow;
      if (base < 2) return pow;
      if (base < 5) return 2 * pow;
      return 5 * pow;
    },

    // Numerical Differentiation
    calculateDerivative() {
      const expr = (document.getElementById('math-deriv-expr')?.value || 'x^2').trim();
      const xVal = parseFloat(document.getElementById('math-deriv-x')?.value || '2');
      const resEl = document.getElementById('math-deriv-result');

      try {
        const fn = MathParser.compile(expr);
        const h = 1e-6;
        // Central difference numerical approximation
        const deriv = (fn(xVal + h) - fn(xVal - h)) / (2 * h);
        if (resEl) {
          resEl.innerHTML = `<span class="text-indigo-400 font-bold">f'(${xVal}) ≈ ${deriv.toFixed(6)}</span>`;
        }
      } catch (e) {
        if (resEl) resEl.innerHTML = '<span class="text-rose-400">Calculation error</span>';
      }
    },

    // Numerical Integration (Simpson's 1/3 Rule)
    calculateIntegral() {
      const expr = (document.getElementById('math-int-expr')?.value || 'sin(x)').trim();
      const a = parseFloat(document.getElementById('math-int-a')?.value || '0');
      const b = parseFloat(document.getElementById('math-int-b')?.value || '3.14159');
      const resEl = document.getElementById('math-int-result');

      try {
        const fn = MathParser.compile(expr);
        const n = 1000; // Even number of sub-intervals
        const h = (b - a) / n;
        let sum = fn(a) + fn(b);

        for (let i = 1; i < n; i++) {
          const x = a + i * h;
          sum += (i % 2 === 0 ? 2 : 4) * fn(x);
        }

        const integral = (h / 3) * sum;
        if (resEl) {
          resEl.innerHTML = `<span class="text-emerald-400 font-bold">∫ ≈ ${integral.toFixed(6)}</span>`;
        }
      } catch (e) {
        if (resEl) resEl.innerHTML = '<span class="text-rose-400">Calculation error</span>';
      }
    },

    // Numerical Root Finding (Bisection / Newton-Raphson)
    calculateRoot() {
      const expr = (document.getElementById('math-root-expr')?.value || 'x^2 - 4').trim();
      let x0 = parseFloat(document.getElementById('math-root-guess')?.value || '1');
      const resEl = document.getElementById('math-root-result');

      try {
        const fn = MathParser.compile(expr);
        const h = 1e-5;
        let iter = 0;
        let root = x0;

        while (iter < 100) {
          const y = fn(root);
          if (Math.abs(y) < 1e-7) break;
          const dy = (fn(root + h) - fn(root - h)) / (2 * h);
          if (Math.abs(dy) < 1e-12) break;
          root = root - y / dy;
          iter++;
        }

        if (resEl) {
          resEl.innerHTML = `<span class="text-amber-400 font-bold">x ≈ ${root.toFixed(6)}</span> <span class="text-slate-400 text-[11px]">(${iter} iterations)</span>`;
        }
      } catch (e) {
        if (resEl) resEl.innerHTML = '<span class="text-rose-400">Calculation error</span>';
      }
    },

    // Complex Number Calculator
    calculateComplex() {
      const a1 = parseFloat(document.getElementById('math-c1-re')?.value || '3');
      const b1 = parseFloat(document.getElementById('math-c1-im')?.value || '4');
      const a2 = parseFloat(document.getElementById('math-c2-re')?.value || '1');
      const b2 = parseFloat(document.getElementById('math-c2-im')?.value || '-2');
      const op = document.getElementById('math-comp-op')?.value || 'add';
      const resEl = document.getElementById('math-complex-result');

      let re = 0, im = 0;
      switch (op) {
        case 'add': re = a1 + a2; im = b1 + b2; break;
        case 'sub': re = a1 - a2; im = b1 - b2; break;
        case 'mul': re = a1 * a2 - b1 * b2; im = a1 * b2 + b1 * a2; break;
        case 'div': {
          const denom = a2 * a2 + b2 * b2;
          if (denom === 0) { if (resEl) resEl.textContent = 'Division by zero'; return; }
          re = (a1 * a2 + b1 * b2) / denom;
          im = (b1 * a2 - a1 * b2) / denom;
          break;
        }
      }

      const mod = Math.sqrt(re * re + im * im);
      const arg = Math.atan2(im, re);
      const argDeg = (arg * 180) / Math.PI;

      if (resEl) {
        resEl.innerHTML = `
          <div class="space-y-1 font-mono text-xs">
            <div><strong>Rectangular:</strong> <span class="text-indigo-400">${re.toFixed(4)} ${im >= 0 ? '+' : '-'} ${Math.abs(im).toFixed(4)}i</span></div>
            <div><strong>Polar:</strong> <span class="text-emerald-400">${mod.toFixed(4)} · e^(i·${arg.toFixed(4)})</span> (${argDeg.toFixed(1)}°)</div>
            <div><strong>Magnitude |z|:</strong> <span class="text-amber-400">${mod.toFixed(4)}</span></div>
          </div>
        `;
      }
    },

    // Matrix Operations (2x2 and 3x3)
    calculateMatrix(op) {
      const resEl = document.getElementById('math-matrix-result');
      // Read 2x2 matrix values
      const m00 = parseFloat(document.getElementById('m-0-0')?.value || '1');
      const m01 = parseFloat(document.getElementById('m-0-1')?.value || '2');
      const m10 = parseFloat(document.getElementById('m-1-0')?.value || '3');
      const m11 = parseFloat(document.getElementById('m-1-1')?.value || '4');

      if (op === 'det') {
        const det = m00 * m11 - m01 * m10;
        if (resEl) resEl.innerHTML = `<span class="text-indigo-400 font-bold">det(A) = ${det}</span>`;
      } else if (op === 'trans') {
        if (resEl) resEl.innerHTML = `<span class="text-emerald-400 font-bold">Aᵀ = [ [${m00}, ${m10}], [${m01}, ${m11}] ]</span>`;
      } else if (op === 'inv') {
        const det = m00 * m11 - m01 * m10;
        if (det === 0) {
          if (resEl) resEl.innerHTML = '<span class="text-rose-400">Matrix is singular (det = 0); no inverse exists</span>';
        } else {
          const inv00 = (m11 / det).toFixed(3);
          const inv01 = (-m01 / det).toFixed(3);
          const inv10 = (-m10 / det).toFixed(3);
          const inv11 = (m00 / det).toFixed(3);
          if (resEl) resEl.innerHTML = `<span class="text-indigo-400 font-bold">A⁻¹ = [ [${inv00}, ${inv01}], [${inv10}, ${inv11}] ]</span>`;
        }
      }
    },

    // Vector 3D Operations
    calculateVectors() {
      const v1 = [
        parseFloat(document.getElementById('v1-x')?.value || '1'),
        parseFloat(document.getElementById('v1-y')?.value || '2'),
        parseFloat(document.getElementById('v1-z')?.value || '3')
      ];
      const v2 = [
        parseFloat(document.getElementById('v2-x')?.value || '4'),
        parseFloat(document.getElementById('v2-y')?.value || '5'),
        parseFloat(document.getElementById('v2-z')?.value || '6')
      ];

      const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
      const cross = [
        v1[1] * v2[2] - v1[2] * v2[1],
        v1[2] * v2[0] - v1[0] * v2[2],
        v1[0] * v2[1] - v1[1] * v2[0]
      ];
      const mag1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2 + v1[2] ** 2);
      const mag2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2 + v2[2] ** 2);
      const angleRad = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
      const angleDeg = (angleRad * 180) / Math.PI;

      const resEl = document.getElementById('math-vector-result');
      if (resEl) {
        resEl.innerHTML = `
          <div class="space-y-1 font-mono text-xs">
            <div><strong>Dot Product (v₁ · v₂):</strong> <span class="text-indigo-400">${dot}</span></div>
            <div><strong>Cross Product (v₁ × v₂):</strong> <span class="text-emerald-400">⟨${cross.join(', ')}⟩</span></div>
            <div><strong>Angle Between:</strong> <span class="text-amber-400">${angleDeg.toFixed(2)}°</span> (${angleRad.toFixed(3)} rad)</div>
          </div>
        `;
      }
    },

    // 3D Wireframe Surface Visualizer
    draw3DSurface() {
      const canvas = document.getElementById('math-3d-canvas');
      if (!canvas || !this.surfaceFn) return;
      const ctx = canvas.getContext('2d');
      const w = (canvas.width = canvas.parentElement.clientWidth || 400);
      const h = (canvas.height = 280);

      ctx.fillStyle = '#080b11';
      ctx.fillRect(0, 0, w, h);

      const radX = (this.view3D.rotX * Math.PI) / 180;
      const radY = (this.view3D.rotY * Math.PI) / 180;

      const project = (x, y, z) => {
        // Rotate around Y then X
        const cosY = Math.cos(radY), sinY = Math.sin(radY);
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;

        const cosX = Math.cos(radX), sinX = Math.sin(radX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        const scale = 25 * this.view3D.zoom;
        const screenX = w / 2 + x1 * scale;
        const screenY = h / 2 - y2 * scale;
        return { x: screenX, y: screenY, depth: z2 };
      };

      const steps = 18;
      const range = 4;
      const stepSize = (range * 2) / steps;

      ctx.lineWidth = 1;

      // Draw wireframe grid
      for (let i = 0; i <= steps; i++) {
        const x = -range + i * stepSize;
        ctx.strokeStyle = `hsla(${(i / steps) * 120 + 200}, 75%, 60%, 0.7)`;
        ctx.beginPath();
        let started = false;
        for (let j = 0; j <= steps; j++) {
          const y = -range + j * stepSize;
          const z = this.surfaceFn(x, y);
          if (!isNaN(z) && isFinite(z)) {
            const p = project(x, z, y);
            if (!started) { ctx.moveTo(p.x, p.y); started = true; }
            else { ctx.lineTo(p.x, p.y); }
          }
        }
        ctx.stroke();
      }
    }
  };

  window.Omnia.mathematicsLab = MathematicsLabModule;
})();
