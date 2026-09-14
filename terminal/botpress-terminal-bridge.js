(() => {
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

  function getResponseText(raw, seen = new Set(), depth = 0) {
    if (raw == null || depth > 8) return '';
    if (typeof raw === 'string') return raw.trim();
    if (typeof raw !== 'object' || seen.has(raw)) return '';
    seen.add(raw);

    for (const key of ['message', 'text', 'markdown', 'preview', 'answer', 'response', 'content']) {
      if (typeof raw[key] === 'string' && raw[key].trim()) return raw[key].trim();
    }

    if (Array.isArray(raw)) {
      return raw.map(item => getResponseText(item, seen, depth + 1)).filter(Boolean).join('\n');
    }

    for (const key of ['payload', 'data', 'event', 'blocks', 'card', 'body', 'result']) {
      if (raw[key] !== undefined) {
        const found = getResponseText(raw[key], seen, depth + 1);
        if (found) return found;
      }
    }

    return '';
  }

  function forward(raw) {
    const data = parseEvent(raw);
    const eventType = String(
      data.eventType || data.type || data.event?.eventType || data.event?.type || ''
    ).toLowerCase();

    const text = getResponseText(data);
    if (!text) return;

    const rawJson = JSON.stringify(data).toLowerCase();
    const isUserMessage =
      /direction["']?\s*:\s*["']?outgoing/.test(rawJson) ||
      /type["']?\s*:\s*["']?user/.test(rawJson) ||
      /user-message/.test(rawJson);

    if (isUserMessage && eventType !== 'terminal_response') return;

    if (
      eventType === 'terminal_response' ||
      eventType === 'notification' ||
      eventType === 'customevent' ||
      eventType === 'message' ||
      /direction["']?\s*:\s*["']?incoming/.test(rawJson)
    ) {
      if (typeof window.__DIVYANK_TERMINAL_HANDLE_RESPONSE__ === 'function') {
        window.__DIVYANK_TERMINAL_HANDLE_RESPONSE__(text);
      }
    }
  }

  function attach() {
    if (!window.botpress || typeof window.botpress.on !== 'function') {
      setTimeout(attach, 200);
      return;
    }

    console.debug('[DIVYANK TERMINAL] Response bridge attached');

    window.botpress.on('customEvent', event => {
      console.debug('[DIVYANK TERMINAL] customEvent:', event);
      forward(event);
    });

    window.botpress.on('message', event => {
      console.debug('[DIVYANK TERMINAL] message:', event);
      forward(event);
    });

    window.botpress.on('*', event => {
      console.debug('[DIVYANK TERMINAL] wildcard:', event);
      forward(event);
    });
  }

  attach();
})();
