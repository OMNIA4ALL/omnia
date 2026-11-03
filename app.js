/**
 * OMNIA 2.0 Platform Bootstrap
 * Initializes all 16 core client modules and PWA service worker upon DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[OMNIA 2.0] Initializing complete platform...');

  if (window.Omnia) {
    if (window.Omnia.navigation) window.Omnia.navigation.init();
    if (window.Omnia.dashboard) window.Omnia.dashboard.init();
    if (window.Omnia.tools) window.Omnia.tools.init();
    if (window.Omnia.earth) window.Omnia.earth.init();
    if (window.Omnia.network) window.Omnia.network.init();
    if (window.Omnia.learn) window.Omnia.learn.init();
    if (window.Omnia.device) window.Omnia.device.init();
    if (window.Omnia.studio) window.Omnia.studio.init();
    if (window.Omnia.focus) window.Omnia.focus.init();
    if (window.Omnia.fileLab) window.Omnia.fileLab.init();
    if (window.Omnia.codePlayground) window.Omnia.codePlayground.init();
    if (window.Omnia.universe) window.Omnia.universe.init();
    if (window.Omnia.simulationLab) window.Omnia.simulationLab.init();
    if (window.Omnia.worldIntelligence) window.Omnia.worldIntelligence.init();
    if (window.Omnia.workspace) window.Omnia.workspace.init();
    if (window.Omnia.privacy) window.Omnia.privacy.init();
    if (window.Omnia.assistant) window.Omnia.assistant.init();
  }

  // Safe PWA Service Worker registration (checks existence first to avoid 404 in console)
  if ('serviceWorker' in navigator && location.protocol === 'https:' && location.host.includes('github.io')) {
    fetch(['.', 'service-worker.js'].join('/'), { method: 'HEAD' })
      .then(res => {
        if (res.ok) {
          navigator.serviceWorker.register(['.', 'service-worker.js'].join('/'), { scope: './' })
            .then(reg => console.log('[OMNIA PWA] ServiceWorker active:', reg.scope))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }

  console.log('[OMNIA] v2.0.0 Online — One Universe. Endless Possibilities.');
});
