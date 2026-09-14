(() => {
  function normalize(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function parseEvent(raw) {
    let data = raw;

    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (_) {}
    }

    if (data && typeof data.event === 'string') {
      try { data = JSON.parse(data.event); } catch (_) {}
    } else if (data && data.event && typeof data.event === 'object') {
      data = data.event;
    }

    return data && typeof data === 'object' ? data : {};
  }

  function getResponseText(raw) {
    const data = parseEvent(raw);
    const candidates = [
      data.message,
      data.text,
      data.markdown,
      data.preview,
      data.answer,
      data.response,
      data.content,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }

    return '';
  }

  function handleCustomEvent(raw) {
    console.debug('[DIVYANK TERMINAL] Botpress customEvent:', raw);
    const data = parseEvent(raw);
    if (data.eventType !== 'terminal_response' && data.eventType !== 'notification') return;

    const text = getResponseText(data);
    if (!text) return;

    if (typeof window.__DIVYANK_TERMINAL_HANDLE_RESPONSE__ === 'function') {
      window.__DIVYANK_TERMINAL_HANDLE_RESPONSE__(text);
      return;
    }

    // script.js normally installs the handler before this bridge receives events.
    // If the event arrives exceptionally early, retry briefly instead of losing it.
    let attempts = 0;
    const retry = setInterval(() => {
      attempts += 1;
      if (typeof window.__DIVYANK_TERMINAL_HANDLE_RESPONSE__ === 'function') {
        clearInterval(retry);
        window.__DIVYANK_TERMINAL_HANDLE_RESPONSE__(text);
      } else if (attempts >= 20) {
        clearInterval(retry);
      }
    }, 100);
  }

  function attach() {
    if (!window.botpress || typeof window.botpress.on !== 'function') {
      setTimeout(attach, 200);
      return;
    }

    window.botpress.on('customEvent', handleCustomEvent);
  }

  attach();
})();
