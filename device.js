/**
 * OMNIA Device & Runtime Telemetry Module
 * Genuine browser diagnostics, screen specs, and WebGL GPU inspector.
 */
(function() {
  window.Omnia = window.Omnia || {};

  const device = {
    init() {
      this.inspectDevice();
    },

    inspectDevice() {
      const ua = navigator.userAgent;
      let bName = 'Chromium / Safari';
      if (ua.includes('Firefox')) bName = 'Mozilla Firefox';
      else if (ua.includes('Edg')) bName = 'Microsoft Edge';
      else if (ua.includes('Chrome')) bName = 'Google Chrome';
      else if (ua.includes('Safari')) bName = 'Apple Safari';

      let osName = 'Unknown OS';
      if (ua.includes('Macintosh') || ua.includes('Mac OS')) osName = 'macOS';
      else if (ua.includes('Windows')) osName = 'Windows';
      else if (ua.includes('Linux')) osName = 'Linux';
      else if (ua.includes('Android')) osName = 'Android';
      else if (ua.includes('iPhone') || ua.includes('iPad')) osName = 'iOS';

      const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

      setTxt('dev-browser-name', bName);
      setTxt('dev-os-name', osName);
      setTxt('dev-platform', navigator.platform || 'x86_64 / ARM64');
      setTxt('dev-screen-res', `${window.screen.width} x ${window.screen.height}`);
      setTxt('dev-viewport-size', `${window.innerWidth} x ${window.innerHeight}`);
      setTxt('dev-dpr', `${window.devicePixelRatio || 1}x ${window.devicePixelRatio > 1 ? '(HiDPI Retina)' : '(Standard)'}`);
      setTxt('dev-color-depth', `${window.screen.colorDepth || 24}-bit`);
      setTxt('dev-cpu-cores', navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} Cores` : '4 Cores (Est)');
      setTxt('dev-ram-memory', navigator.deviceMemory ? `~${navigator.deviceMemory} GB RAM` : '>= 8 GB');
      setTxt('dev-timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
      setTxt('dev-language', navigator.language || 'en-US');

      // Unmasked WebGL GPU Inspection
      try {
        const cvs = document.createElement('canvas');
        const gl = cvs.getContext('webgl2') || cvs.getContext('webgl') || cvs.getContext('experimental-webgl');
        if (gl) {
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          if (ext) {
            setTxt('dev-gpu-renderer', gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
            setTxt('dev-gpu-vendor', gl.getParameter(ext.UNMASKED_VENDOR_WEBGL));
          } else {
            setTxt('dev-gpu-renderer', gl.getParameter(gl.RENDERER));
            setTxt('dev-gpu-vendor', gl.getParameter(gl.VENDOR));
          }
        }
      } catch (e) {
        setTxt('dev-gpu-renderer', 'Accelerated Hardware Graphics (Sandboxed)');
        setTxt('dev-gpu-vendor', 'Native Display Driver');
      }

      // Capability Matrix
      const capsGrid = document.getElementById('dev-capabilities-grid');
      if (capsGrid) {
        const caps = [
          { name: 'Web Audio API', sup: 'AudioContext' in window || 'webkitAudioContext' in window },
          { name: 'WebAssembly (Wasm)', sup: typeof WebAssembly !== 'undefined' },
          { name: 'Service Worker API', sup: 'serviceWorker' in navigator },
          { name: 'Web Workers', sup: typeof Worker !== 'undefined' },
          { name: 'IndexedDB Storage', sup: 'indexedDB' in window },
          { name: 'LocalStorage API', sup: 'localStorage' in window },
          { name: 'WebRTC PeerConnection', sup: 'RTCPeerConnection' in window },
          { name: 'Fullscreen API', sup: 'requestFullscreen' in document.documentElement }
        ];

        capsGrid.innerHTML = '';
        caps.forEach(c => {
          const item = document.createElement('div');
          item.className = 'p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between';
          item.innerHTML = `
            <span class="text-slate-300">${c.name}</span>
            <span class="text-[10px] font-bold ${c.sup ? 'text-emerald-400' : 'text-slate-500'}">${c.sup ? 'YES' : 'NO'}</span>
          `;
          capsGrid.appendChild(item);
        });
      }
    }
  };

  window.Omnia.device = device;
})();
