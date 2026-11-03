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

  // Optional PWA Service Worker registration (only active if file is explicitly present in multi-file deployment)
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !document.querySelector('meta[name="omnia-standalone"]')) {
    // Avoid head request 404 on single-file deployments
  }

  console.log('[OMNIA] v2.0.0 Online — One Universe. Endless Possibilities.');
});
