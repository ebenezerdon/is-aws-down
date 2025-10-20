(function(){
  // Global namespace
  window.App = window.App || {};
  const App = window.App;

  App.version = '1.0.0';

  // Lightweight storage wrapper for persistence
  App.Storage = {
    key: 'isawsback:last-check',
    save: function(obj){
      try { localStorage.setItem(this.key, JSON.stringify(obj)); } catch(e){ console.warn('Storage save failed', e); }
    },
    load: function(){
      try {
        const raw = localStorage.getItem(this.key);
        return raw ? JSON.parse(raw) : null;
      } catch(e){ console.warn('Storage load failed', e); return null; }
    }
  };

  // Utilities
  App.Helpers = {
    formatTime: function(ts){
      try { if(!ts) return 'Never'; return new Date(ts).toLocaleString(); } catch(e){ return 'Unknown'; }
    },
    isReducedMotion: function(){
      try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){ return false; }
    }
  };

  // Networking helpers with CORS-friendly mirrors
  App.Net = {
    fetchStatusText: async function(){
      const targets = [
        'https://r.jina.ai/http://health.aws.amazon.com/health/status',
        'https://r.jina.ai/https://health.aws.amazon.com/health/status',
        'https://api.allorigins.win/raw?url=https%3A%2F%2Fhealth.aws.amazon.com%2Fhealth%2Fstatus'
      ];
      let lastErr = null;
      for (let i=0;i<targets.length;i++){
        const url = targets[i] + (targets[i].includes('?') ? '&' : '?') + 't=' + Date.now();
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) { lastErr = new Error('HTTP ' + res.status); continue; }
          const text = await res.text();
          if (text && text.trim().length > 0) {
            return { source: url, text: text };
          }
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error('Failed to fetch');
    }
  };

  // Parser heuristics to decide if AWS is down from the page text
  App.Parser = {
    isDownFrom: function(text){
      if (!text) return null;
      const lower = String(text).toLowerCase();
      // Positive signals
      const okSignals = [
        'operating normally',
        'no ongoing events',
        'all systems',
        'no events reported',
        'healthy'
      ];
      // Incident signals
      const badSignals = [
        'ongoing',
        'degradation',
        'outage',
        'impact',
        'investigating',
        'interruption',
        'service disruption',
        'issue',
        'incident',
        'event'
      ];

      const okHits = okSignals.filter(k => lower.includes(k)).length;
      const badHits = badSignals.filter(k => lower.includes(k)).length;

      if (badHits > 0 && okHits === 0) return true;      // likely down or degraded
      if (okHits > 0 && badHits === 0) return false;     // likely normal

      // Fallback heuristic
      if (/ongoing|current|open\s+issues/.test(lower)) return true;

      return null; // unknown
    }
  };

  // High-level checker
  App.Checker = {
    checkNow: async function(){
      try {
        const payload = await App.Net.fetchStatusText();
        let down = App.Parser.isDownFrom(payload.text);
        if (down === null) {
          // conservative default: not down if unclear
          down = false;
        }
        const result = {
          down: !!down,
          source: payload.source,
          timestamp: Date.now(),
          raw: payload.text.slice(0, 4000)
        };
        App.Storage.save(result);
        return result;
      } catch (e) {
        const fallback = { down: null, source: 'error', error: e && e.message ? e.message : 'Network error', timestamp: Date.now() };
        App.Storage.save(fallback);
        return fallback;
      }
    }
  };
})();
