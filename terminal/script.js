const output = document.querySelector('#output');
const form = document.querySelector('#terminal-form');
const input = document.querySelector('#command');
const status = document.querySelector('#status');
const history = [];
let historyIndex = 0;
let waitingForAI = false;
let lastQuestion = '';
let responseTimeout = null;
let botpressReady = false;
let listenersAttached = false;

const commands = {
  help: () => [
    ['accent', 'Available commands'],
    ['', 'ask <question>  Ask VANTA about Divyank'],
    ['', 'about            About Divyank'],
    ['', 'skills           Languages and tools'],
    ['', 'projects         Featured engineering projects'],
    ['', 'repos            GitHub repositories'],
    ['', 'journey          Current engineering journey'],
    ['', 'education        Education'],
    ['', 'hackathons       Hackathon and collaboration focus'],
    ['', 'contact          Contact / social links'],
    ['', 'github           Open GitHub profile'],
    ['', 'clear             Clear terminal'],
    ['', ''],
    ['muted', 'Natural language is supported — you do not need to use a command.'],
    ['muted', 'Example: "What skills does Divyank have?"'],
  ],
  about: () => [
    ['accent', 'DIVYANK BHARDWAJ'],
    ['', 'Computer Science Engineering student and software builder.'],
    ['', 'Focused on software engineering, web development, AI/ML,'],
    ['', 'distributed systems, cloud infrastructure and system design.'],
    ['', ''],
    ['success', 'Mission: learn deeply → build relentlessly → ship real systems.'],
  ],
  skills: () => [
    ['accent', 'ENGINEERING TOOLBELT'],
    ['', 'Languages     Python • Java • C • C++ • JavaScript • TypeScript'],
    ['', 'Frontend      React • Next.js • Tailwind • Redux'],
    ['', 'Backend       Node.js • Express • APIs'],
    ['', 'Data          PostgreSQL • MySQL • MongoDB • Prisma • Redis'],
    ['', 'Infra         Linux • Docker • Kubernetes • AWS • Terraform • Nginx'],
    ['', 'Engineering   Git • GitHub • GitLab • GitHub Actions • CI/CD'],
    ['', 'Tools         Postman • VS Code • IntelliJ • Figma • Notion • Jira'],
  ],
  projects: () => [
    ['accent', 'FEATURED PROJECTS'],
    ['', 'NOVIQ        AI-native distributed-systems flagship build'],
    ['', 'JANVISTA AI  AI-native public-infrastructure intelligence'],
    ['', 'ARGUS        AI / systems engineering project'],
    ['', ''],
    ['muted', 'Ask a natural-language question for more context.'],
  ],
  repos: () => [
    ['accent', 'GITHUB'],
    ['', 'Profile: github.com/DIVYANK-BHARDWAJ'],
    ['', 'Explore repositories, source code and ongoing builds.'],
  ],
  journey: () => [
    ['accent', 'ENGINEERING JOURNEY'],
    ['', '→ Strengthen CS fundamentals'],
    ['', '→ Master DSA with Java'],
    ['', '→ Build production-grade full-stack systems'],
    ['', '→ Go deeper into AI engineering'],
    ['', '→ Learn distributed systems and system design'],
    ['', '→ Build cloud / DevOps capability'],
    ['', '→ Contribute through open source and hackathons'],
  ],
  education: () => [
    ['accent', 'EDUCATION'],
    ['', 'Computer Science & Engineering'],
    ['', 'BMS Institute of Technology & Management, Bengaluru'],
  ],
  hackathons: () => [
    ['accent', 'BUILD • COMPETE • COLLABORATE'],
    ['', 'Hackathons • Ideathons • Open Source • Collaborative Builds'],
    ['', 'The goal: use constraints to build, ship and learn faster.'],
  ],
  contact: () => [
    ['accent', 'CONTACT'],
    ['', 'GitHub    github.com/DIVYANK-BHARDWAJ'],
    ['', 'Social links are available on the main GitHub profile.'],
  ],
  github: () => {
    window.open('https://github.com/DIVYANK-BHARDWAJ', '_blank', 'noopener,noreferrer');
    return [['success', 'Opening GitHub...']];
  },
  clear: () => null,
};

function print(lines) {
  if (lines === null) {
    output.innerHTML = '';
    return;
  }
  for (const [kind, text] of lines) {
    const div = document.createElement('div');
    div.className = `line ${kind || ''}`;
    div.textContent = text;
    output.appendChild(div);
  }
  output.scrollTop = output.scrollHeight;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function extractText(value, seen = new Set(), depth = 0) {
  if (value == null || depth > 10) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value !== 'object' || seen.has(value)) return '';
  seen.add(value);

  for (const key of ['text', 'markdown', 'content', 'preview', 'answer', 'response', 'message', 'title', 'value']) {
    if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
  }

  if (Array.isArray(value)) {
    return value.map(item => extractText(item, seen, depth + 1)).filter(Boolean).join('\n');
  }

  for (const key of ['payload', 'data', 'message', 'messages', 'blocks', 'card', 'event', 'body', 'result']) {
    if (value[key] !== undefined) {
      const found = extractText(value[key], seen, depth + 1);
      if (found) return found;
    }
  }

  return '';
}

function getEventType(message) {
  if (!message || typeof message !== 'object') return '';
  return String(
    message.eventType || message.type || message.event?.eventType || message.event?.type || ''
  ).toLowerCase();
}

function looksLikeUserEcho(message, text) {
  const answer = normalize(text);
  const question = normalize(lastQuestion);
  if (!answer || answer === question) return true;

  const raw = JSON.stringify(message || {}).toLowerCase();
  return (
    /direction["']?\s*:\s*["']?outgoing/.test(raw) ||
    /type["']?\s*:\s*["']?user/.test(raw) ||
    /user-message/.test(raw)
  );
}

function handleAIResponse(text) {
  if (!waitingForAI || !text) return;

  clearResponseTimeout();
  waitingForAI = false;
  status.textContent = 'VANTA ONLINE';
  print([['ai', `VANTA  ${text}`]]);
  // Keep the Botpress transport alive. Closing it after every response can
  // cause mobile browsers to suspend/recreate the embedded transport.
}

window.__DIVYANK_TERMINAL_HANDLE_RESPONSE__ = handleAIResponse;

function handleIncomingEvent(event) {
  if (!waitingForAI || !event) return;

  console.debug('[DIVYANK TERMINAL] Botpress event:', event);
  const eventType = getEventType(event);

  if (eventType === 'terminal_response' || eventType === 'notification') {
    const customText = extractText(event);
    if (customText) {
      handleAIResponse(customText);
      return;
    }
  }

  const text = extractText(event);
  if (!text || looksLikeUserEcho(event, text)) return;

  const raw = JSON.stringify(event).toLowerCase();
  const isClearlyIncoming =
    /direction["']?\s*:\s*["']?incoming/.test(raw) ||
    /type["']?\s*:\s*["']?(bot|incoming)/.test(raw) ||
    /role["']?\s*:\s*["']?(assistant|bot)/.test(raw);

  if (eventType === 'message' || isClearlyIncoming) handleAIResponse(text);
}

function handleCustomEvent(event) {
  handleIncomingEvent({
    ...((event && typeof event === 'object') ? event : {}),
    eventType: event?.eventType || 'customEvent'
  });
}

function handleBotpressMessage(message) {
  handleIncomingEvent({
    ...((message && typeof message === 'object') ? message : {}),
    eventType: message?.eventType || 'message'
  });
}

function suppressBotpressUI(root = document) {
  const selectors = [
    '#bp-web-widget-container',
    'iframe[title="Botpress"]',
    'iframe[src*="botpress"]',
    'iframe[src*="bpcontent"]',
    '.bpWebchat',
    '.bpFab',
    '[class*="bpWebchat"]',
    '[class*="bpFab"]',
  ];

  try {
    for (const selector of selectors) {
      root.querySelectorAll(selector).forEach(node => {
        // Keep Botpress mounted/alive. Do not use display:none on the
        // transport because some mobile browsers can suspend hidden embeds.
        node.style.setProperty('opacity', '0', 'important');
        node.style.setProperty('visibility', 'hidden', 'important');
        node.style.setProperty('pointer-events', 'none', 'important');
        node.style.setProperty('z-index', '-1', 'important');
      });
    }

    root.querySelectorAll('*').forEach(node => {
      if (node.shadowRoot) suppressBotpressUI(node.shadowRoot);
    });
  } catch (error) {
    console.debug('[DIVYANK TERMINAL] UI suppression probe:', error);
  }
}

function startUISuppression() {
  suppressBotpressUI();
  const observer = new MutationObserver(() => suppressBotpressUI());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(suppressBotpressUI, 1000);
}

function clearResponseTimeout() {
  if (responseTimeout) {
    clearTimeout(responseTimeout);
    responseTimeout = null;
  }
}

function failAI(message) {
  clearResponseTimeout();
  waitingForAI = false;
  status.textContent = 'VANTA ERROR';
  print([['warn', message]]);
}

function attachBotpress() {
  if (!window.botpress || typeof window.botpress.on !== 'function') {
    status.textContent = 'VANTA LOADING';
    setTimeout(attachBotpress, 150);
    return;
  }

  if (listenersAttached) return;
  listenersAttached = true;

  window.botpress.on('message', handleBotpressMessage);
  window.botpress.on('customEvent', handleCustomEvent);
  // Compatibility layer for Webchat event-shape differences.
  window.botpress.on('*', event => {
    if (event?.type === 'message' || event?.eventType === 'terminal_response') {
      handleIncomingEvent(event);
    }
  });

  window.botpress.on('webchat:initialized', () => {
    status.textContent = waitingForAI ? 'VANTA THINKING' : 'VANTA ONLINE';
  });

  window.botpress.on('webchat:ready', () => {
    botpressReady = true;
    status.textContent = waitingForAI ? 'VANTA THINKING' : 'VANTA ONLINE';
    if (waitingForAI) sendPendingQuestion();
  });

  window.botpress.on('error', error => {
    console.error('[DIVYANK TERMINAL] Botpress error:', error);
    if (waitingForAI) failAI(`Botpress error: ${error?.message || 'connection error'}`);
  });
}

async function sendPendingQuestion() {
  if (!waitingForAI || !lastQuestion) return;

  if (!window.botpress || typeof window.botpress.sendMessage !== 'function') {
    failAI('VANTA is not ready to receive messages yet. Refresh and try again.');
    return;
  }

  try {
    await window.botpress.sendMessage(lastQuestion);
  } catch (error) {
    console.error('[DIVYANK TERMINAL] sendMessage failed:', error);
    failAI(`Botpress error: ${error?.message || 'message could not be sent'}`);
  }
}

function askAI(question) {
  if (!window.botpress || typeof window.botpress.on !== 'function') {
    print([['warn', 'VANTA is still loading. Try again in a moment.']]);
    attachBotpress();
    return;
  }

  if (waitingForAI) {
    print([['muted', 'VANTA is still answering the previous question.']]);
    return;
  }

  waitingForAI = true;
  lastQuestion = question;
  status.textContent = 'VANTA THINKING';
  print([['muted', 'VANTA  thinking...']]);

  clearResponseTimeout();
  responseTimeout = setTimeout(() => {
    if (waitingForAI) {
      failAI('VANTA generated a response, but the terminal did not receive the Botpress event.');
    }
  }, 45000);

  if (botpressReady && typeof window.botpress.sendMessage === 'function') {
    sendPendingQuestion();
    return;
  }

  if (typeof window.botpress.open !== 'function') {
    failAI('VANTA transport is not initialized yet. Refresh and try again.');
    return;
  }

  try {
    window.botpress.open();
    // webchat:ready will send the pending question.
  } catch (_) {
    failAI('Could not initialize the VANTA transport. Refresh and try again.');
  }
}

function isNaturalLanguageQuestion(raw) {
  const words = raw.trim().split(/\s+/);
  return words.length >= 3 || /[?!.,]/.test(raw);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const raw = input.value.trim();
  if (!raw) return;

  history.push(raw);
  historyIndex = history.length;
  print([['muted', `divyank@github:~$ ${raw}`]]);
  input.value = '';

  const normalized = raw.toLowerCase();
  const command = normalized.split(/\s+/)[0];
  const remainder = raw.slice(command.length).trim();

  if (command === 'ask') {
    if (!remainder) print([['warn', 'Usage: ask <your question>']]);
    else askAI(remainder);
    return;
  }

  if (commands[command] && !isNaturalLanguageQuestion(raw)) {
    print(commands[command]());
    return;
  }

  if (commands[command] && !remainder) {
    print(commands[command]());
    return;
  }

  askAI(raw);
});

input.addEventListener('keydown', event => {
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (historyIndex > 0) input.value = history[--historyIndex];
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (historyIndex < history.length - 1) input.value = history[++historyIndex];
    else { historyIndex = history.length; input.value = ''; }
  }
});

document.addEventListener('click', () => input.focus());

print([
  ['accent', '╭──────────────────────────────────────────────────────╮'],
  ['accent', '│              DIVYANK BHARDWAJ                       │'],
  ['accent', '│        Interactive Engineering Terminal             │'],
  ['accent', '╰──────────────────────────────────────────────────────╯'],
  ['', ''],
  ['', 'Welcome. Ask me anything about Divyank.'],
  ['', 'Try: "What skills does Divyank have?"'],
  ['muted', 'Or type "help" to see terminal shortcuts.'],
  ['', ''],
]);

startUISuppression();
attachBotpress();
