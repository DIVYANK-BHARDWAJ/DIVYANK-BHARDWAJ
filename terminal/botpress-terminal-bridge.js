(() => {
  const output = document.querySelector('#output');
  const status = document.querySelector('#status');
  if (!output) return;

  let handled = false;

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

  function renderAnswer(text) {
    if (!text || handled) return;
    handled = true;

    [...output.querySelectorAll('.line')].forEach(line => {
      if (normalize(line.textContent).includes('ai thinking')) line.remove();
    });

    const div = document.createElement('div');
    div.className = 'line ai';
    div.textContent = `AI  ${text}`;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;

    if (status) status.textContent = 'AI ONLINE';
    try { window.botpress.close(); } catch (_) {}
  }

  function attach() {
    if (!window.botpress || typeof window.botpress.on !== 'function') {
      setTimeout(attach, 200);
      return;
    }

    window.botpress.on('customEvent', event => {
      console.debug('[DIVYANK TERMINAL] Botpress customEvent:', event);
      const data = parseEvent(event);
      if (data.eventType !== 'terminal_response' && data.eventType !== 'notification') return;
      renderAnswer(getResponseText(data));
    });
  }

  attach();
})();
