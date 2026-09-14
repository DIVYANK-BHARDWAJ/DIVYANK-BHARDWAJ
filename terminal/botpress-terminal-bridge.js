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
      data.response,
      data.message,
      data.text,
      data.markdown,
      data.preview,
      data.answer,
      data.content,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }

    return '';
  }

  function renderAnswer(text) {
    if (!text) return;

    // script.js owns the terminal response state. Let it clear the timeout,
    // release the input, update status, and render the answer exactly once.
    if (typeof window.__DIVYANK_TERMINAL_HANDLE_RESPONSE__ === 'function') {
      window.__DIVYANK_TERMINAL_HANDLE_RESPONSE__(text);
      return;
    }

    // Safe fallback if script.js has not finished loading yet.
    const output = document.querySelector('#output');
    const status = document.querySelector('#status');
    if (!output) return;

    [...output.querySelectorAll('.line')].forEach(line => {
      if (normalize(line.textContent).includes('ai thinking')) line.remove();
    });

    const div = document.createElement('div');
    div.className = 'line ai';
    div.textContent = `AI  ${text}`;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
    if (status) status.textContent = 'AI ONLINE';
  }

  function attach() {
    if (!window.botpress || typeof window.botpress.on !== 'function') {
      setTimeout(attach, 200);
      return;
    }

    window.botpress.on('customEvent', event => {
      console.debug('[DIVYANK TERMINAL] Botpress customEvent:', event);
      const data = parseEvent(event);
      if (data.eventType !== 'terminal_response') return;
      renderAnswer(getResponseText(data));
    });
  }

  attach();
})();
