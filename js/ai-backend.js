/**
 * OMNIA 2.0 - Compatibility Stub for Background Helper
 * Legacy hidden Gemini background requests have been removed to honor user privacy
 * and the Gemini-to-Cloudflare Workers AI migration.
 * Preserves the window.Omnia.aiBackend interface so existing modules remain unaffected.
 */
(function() {
  window.Omnia = window.Omnia || {};

  const AiBackend = {
    getApiKey() {
      return '';
    },

    async queryBackgroundAi() {
      return null;
    },

    async autoFixJson() {
      return null;
    },

    async auditWeatherData() {
      return null;
    },

    async auditSimulationParams() {
      return null;
    }
  };

  window.Omnia.aiBackend = AiBackend;
  window.AiBackend = AiBackend;
})();
