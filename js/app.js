/**
 * OMNIA Application Bootstrap
 * Initializes all client modules upon DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[OMNIA] Initializing core modules...');

  if (window.Omnia) {
    if (window.Omnia.navigation) window.Omnia.navigation.init();
    if (window.Omnia.tools) window.Omnia.tools.init();
    if (window.Omnia.earth) window.Omnia.earth.init();
    if (window.Omnia.network) window.Omnia.network.init();
    if (window.Omnia.learn) window.Omnia.learn.init();
    if (window.Omnia.device) window.Omnia.device.init();
    if (window.Omnia.studio) window.Omnia.studio.init();
    if (window.Omnia.focus) window.Omnia.focus.init();
  }

  console.log('[OMNIA] v1.0.0 Online — One Universe. Endless Possibilities.');
});
