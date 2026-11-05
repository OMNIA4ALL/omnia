/**
 * OMNIA 2.0 - Background AI Intelligence Engine (Gemini Powered)
 * Operates quietly in the background across core features without front-end clutter.
 * Validates data sanity, detects unphysical parameters, audits syntax, and flags anomalies.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
    showToast(m, t) { console.log(m, t); }
  };

  const AiBackend = {
    geminiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',

    getApiKey() {
      return localStorage.getItem('omnia_gemini_api_key') || '';
    },

    /**
     * Executes a quiet background Gemini prompt.
     * Returns null if key is missing or request fails.
     */
    async queryBackgroundAi(systemPrompt, userPrompt) {
      const apiKey = this.getApiKey();
      if (!apiKey) return null;

      try {
        const url = `${this.geminiEndpoint}?key=${apiKey}`;
        const payload = {
          contents: [{
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nTask: ${userPrompt}` }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 300
          }
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) return null;
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
      } catch (e) {
        return null;
      }
    },

    /**
     * 1. Code & JSON Validation: Auto-detects and suggests fixes for broken JSON
     */
    async autoFixJson(invalidJsonText) {
      const system = 'You are a background JSON auto-repair engine. Given malformed JSON text, fix missing quotes, commas, or brackets and output ONLY the valid raw JSON string. Do not include markdown codeblocks or explanations.';
      const repaired = await this.queryBackgroundAi(system, invalidJsonText);
      if (!repaired) return null;
      try {
        JSON.parse(repaired);
        return repaired;
      } catch (e) {
        return null;
      }
    },

    /**
     * 2. Simulation & Physics Parameter Validation: Flags impossible or unphysical inputs
     */
    async checkPhysicsSanity(simName, params) {
      // Local deterministic checks first
      if (simName === 'projectile') {
        if (params.v0 > 299792458) return { valid: false, reason: 'Velocity exceeds the speed of light (c).' };
        if (params.gravity <= 0) return { valid: false, reason: 'Gravity must be positive for standard projectile trajectories.' };
      } else if (simName === 'ohm') {
        if (params.r <= 0) return { valid: false, reason: 'Zero or negative resistance causes an infinite short circuit.' };
      }

      // If AI key is available, perform background sanity audit
      const system = 'You are a physics sanity checker. Given a simulation name and numerical parameters, reply with "OK" if physically sound, or a 1-sentence explanation of why it violates physical laws.';
      const result = await this.queryBackgroundAi(system, `Simulation: ${simName}, Parameters: ${JSON.stringify(params)}`);
      if (result && !result.toLowerCase().startsWith('ok')) {
        return { valid: false, reason: result };
      }
      return { valid: true };
    },

    /**
     * 3. Earth & Atmosphere Data Audit: Checks for anomalous meteorological sensor spikes
     */
    auditWeatherData(cur) {
      if (!cur) return;
      // Physical sanity bounds for Earth atmosphere
      if (cur.temperature_2m < -90 || cur.temperature_2m > 60) {
        console.warn('[OMNIA AI Backend] Anomalous surface temperature flagged:', cur.temperature_2m);
      }
      if (cur.relative_humidity_2m < 0 || cur.relative_humidity_2m > 100) {
        console.warn('[OMNIA AI Backend] Invalid humidity range flagged:', cur.relative_humidity_2m);
      }
    }
  };

  window.Omnia.aiBackend = AiBackend;
  window.AiBackend = AiBackend;
})();
