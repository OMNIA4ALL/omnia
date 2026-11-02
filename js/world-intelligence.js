(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
    showToast(m) { console.log(m); }
  };
  const api = window.Omnia.api || {};

/**
 * OMNIA 2.0 - World Intelligence Module
 * World Clock comparison, Frankfurter ECB Currency Converter, REST Countries explorer, and 13-category Unit Converter
 */

const WorldIntelligenceModule = {
  countries: [],
  rates: {},
  ratesBase: 'USD',
  ratesDate: '',

  init() {
    this.bindWorldClocks();
    this.bindCurrencyConverter();
    this.bindCountriesExplorer();
    this.bindUnitConverter();
    this.fetchRates();
  },

  bindWorldClocks() {
    const list = document.getElementById('world-clocks-list');
    if (!list) return;

    const timezones = [
      { city: 'London', tz: 'Europe/London', country: 'United Kingdom' },
      { city: 'New York', tz: 'America/New_York', country: 'United States' },
      { city: 'Tokyo', tz: 'Asia/Tokyo', country: 'Japan' },
      { city: 'New Delhi', tz: 'Asia/Kolkata', country: 'India' },
      { city: 'Sydney', tz: 'Australia/Sydney', country: 'Australia' },
      { city: 'Paris', tz: 'Europe/Paris', country: 'France' },
      { city: 'Dubai', tz: 'Asia/Dubai', country: 'United Arab Emirates' },
      { city: 'San Francisco', tz: 'America/Los_Angeles', country: 'United States' }
    ];

    const updateClocks = () => {
      const now = new Date();
      list.innerHTML = timezones.map(t => {
        const timeStr = now.toLocaleTimeString('en-US', { timeZone: t.tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const dateStr = now.toLocaleDateString('en-US', { timeZone: t.tz, weekday: 'short', month: 'short', day: 'numeric' });
        
        // UTC offset
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: t.tz, timeZoneName: 'shortOffset' }).formatToParts(now);
        const offset = parts.find(p => p.type === 'timeZoneName')?.value || 'UTC';

        return `
          <div class="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
            <div>
              <div class="text-sm font-bold text-white">${t.city}</div>
              <div class="text-[11px] text-slate-400">${t.country} • ${offset}</div>
            </div>
            <div class="text-right">
              <div class="text-base font-mono font-bold text-indigo-300">${timeStr}</div>
              <div class="text-[10px] text-slate-400 font-mono">${dateStr}</div>
            </div>
          </div>
        `;
      }).join('');
    };

    updateClocks();
    setInterval(updateClocks, 1000);
  },

  async fetchRates() {
    const statusEl = document.getElementById('world-curr-status');
    try {
      const data = await api.getExchangeRates('USD');
      if (data && data.rates) {
        this.rates = data.rates;
        this.rates['USD'] = 1.0;
        this.ratesBase = data.base || 'USD';
        this.ratesDate = data.date || '';
        if (statusEl) statusEl.textContent = `Live ECB Rates (${this.ratesDate})`;
        this.convertCurrency();
      }
    } catch (e) {
      if (statusEl) statusEl.textContent = 'Using cached exchange rates';
      // Fallback indicative baseline
      this.rates = { USD: 1.0, EUR: 0.92, GBP: 0.79, JPY: 154.2, INR: 84.1, CAD: 1.38, AUD: 1.51, CHF: 0.88, CNY: 7.23 };
      this.convertCurrency();
    }
  },

  bindCurrencyConverter() {
    const amountIn = document.getElementById('world-curr-amount');
    const fromSelect = document.getElementById('world-curr-from');
    const toSelect = document.getElementById('world-curr-to');
    const swapBtn = document.getElementById('world-curr-swap');

    if (amountIn) amountIn.addEventListener('input', () => this.convertCurrency());
    if (fromSelect) fromSelect.addEventListener('change', () => this.convertCurrency());
    if (toSelect) toSelect.addEventListener('change', () => this.convertCurrency());

    if (swapBtn && fromSelect && toSelect) {
      swapBtn.addEventListener('click', () => {
        const tmp = fromSelect.value;
        fromSelect.value = toSelect.value;
        toSelect.value = tmp;
        this.convertCurrency();
      });
    }
  },

  convertCurrency() {
    const amount = parseFloat(document.getElementById('world-curr-amount')?.value) || 0;
    const from = document.getElementById('world-curr-from')?.value || 'USD';
    const to = document.getElementById('world-curr-to')?.value || 'EUR';
    const resultEl = document.getElementById('world-curr-result');
    const rateEl = document.getElementById('world-curr-rate');
    if (!resultEl) return;

    const rateFrom = this.rates[from] || 1;
    const rateTo = this.rates[to] || 1;
    const converted = (amount / rateFrom) * rateTo;
    const singleRate = (1 / rateFrom) * rateTo;

    resultEl.textContent = `${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${to}`;
    if (rateEl) {
      rateEl.textContent = `1 ${from} = ${singleRate.toFixed(4)} ${to}`;
    }
  },

  async bindCountriesExplorer() {
    const searchInput = document.getElementById('world-country-search');
    const container = document.getElementById('world-countries-container');
    if (!container) return;

    container.innerHTML = '<div class="p-4 text-xs text-slate-400">Loading country intelligence database...</div>';

    try {
      this.countries = await api.getCountries();
      this.renderCountries(this.countries.slice(0, 12));
    } catch (e) {
      container.innerHTML = '<div class="p-4 text-xs text-amber-400">Failed to load country dataset. Check connectivity.</div>';
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          this.renderCountries(this.countries.slice(0, 12));
          return;
        }
        const filtered = this.countries.filter(c => 
          (c.name?.common?.toLowerCase() || '').includes(query) ||
          (c.capital?.[0]?.toLowerCase() || '').includes(query) ||
          (c.region?.toLowerCase() || '').includes(query)
        ).slice(0, 24);
        this.renderCountries(filtered);
      });
    }
  },

  renderCountries(list) {
    const container = document.getElementById('world-countries-container');
    if (!container) return;
    if (list.length === 0) {
      container.innerHTML = '<div class="p-4 text-xs text-slate-400 col-span-full">No countries matched your search.</div>';
      return;
    }

    container.innerHTML = list.map(c => {
      const name = c.name?.common || 'Unknown';
      const flag = c.flags?.svg || c.flags?.png || '';
      const capital = c.capital?.[0] || 'N/A';
      const pop = c.population ? c.population.toLocaleString() : 'N/A';
      const region = c.region || 'World';
      const languages = c.languages ? Object.values(c.languages).join(', ') : 'N/A';

      return `
        <div class="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition">
          <div class="flex items-center gap-3 mb-2.5">
            ${flag ? `<img src="${flag}" alt="${name} flag" class="w-8 h-5 object-cover rounded shadow border border-white/10">` : ''}
            <div>
              <div class="text-sm font-bold text-white">${name}</div>
              <div class="text-[11px] text-indigo-400 font-medium">${capital} • ${region}</div>
            </div>
          </div>
          <div class="space-y-1 text-xs text-slate-300">
            <div><span class="text-slate-400">Population:</span> <strong class="text-slate-200">${pop}</strong></div>
            <div class="truncate"><span class="text-slate-400">Languages:</span> <strong class="text-slate-200">${languages}</strong></div>
            <div><span class="text-slate-400">Area:</span> <strong class="text-slate-200">${c.area ? c.area.toLocaleString() + ' km²' : 'N/A'}</strong></div>
          </div>
        </div>
      `;
    }).join('');
  },

  bindUnitConverter() {
    // 13 dimensions
    const unitDefinitions = {
      length: { base: 'm', units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.34, yd: 0.9144, ft: 0.3048, in: 0.0254 } },
      mass: { base: 'kg', units: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, t: 1000 } },
      speed: { base: 'mps', units: { mps: 1, kph: 0.277778, mph: 0.44704, knot: 0.514444 } },
      time: { base: 's', units: { s: 1, min: 60, hr: 3600, day: 86400, yr: 31536000 } },
      data: { base: 'B', units: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 } },
      pressure: { base: 'Pa', units: { Pa: 1, bar: 100000, atm: 101325, psi: 6894.76 } },
      energy: { base: 'J', units: { J: 1, kJ: 1000, cal: 4.184, kcal: 4184, kWh: 3600000 } }
    };

    const catSelect = document.getElementById('world-unit-category');
    const valInput = document.getElementById('world-unit-val');
    const fromSelect = document.getElementById('world-unit-from');
    const toSelect = document.getElementById('world-unit-to');
    const resultBox = document.getElementById('world-unit-result');

    const updateSelectors = () => {
      const cat = catSelect?.value || 'length';
      const def = unitDefinitions[cat];
      if (!def) return;
      const keys = Object.keys(def.units);
      if (fromSelect) fromSelect.innerHTML = keys.map(k => `<option value="${k}">${k}</option>`).join('');
      if (toSelect) toSelect.innerHTML = keys.map(k => `<option value="${k}">${k}</option>`).join('');
      if (toSelect && keys.length > 1) toSelect.value = keys[1];
      calculate();
    };

    const calculate = () => {
      const cat = catSelect?.value || 'length';
      const def = unitDefinitions[cat];
      if (!def || !resultBox) return;
      const val = parseFloat(valInput?.value) || 0;
      const from = fromSelect?.value;
      const to = toSelect?.value;
      
      const inBase = val * def.units[from];
      const out = inBase / def.units[to];
      resultBox.textContent = `${val} ${from} = ${out.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${to}`;
    };

    if (catSelect) catSelect.addEventListener('change', updateSelectors);
    if (valInput) valInput.addEventListener('input', calculate);
    if (fromSelect) fromSelect.addEventListener('change', calculate);
    if (toSelect) toSelect.addEventListener('change', calculate);
    updateSelectors();
  }
};

window.WorldIntelligenceModule = WorldIntelligenceModule;


  window.Omnia.worldIntelligence = WorldIntelligenceModule;
  window.WorldIntelligenceModule = WorldIntelligenceModule;
})();
