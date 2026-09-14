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
    ['', 'ask <question>  Ask the AI about Divyank'],
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
  if (value == null || depth > 6) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value !== 'object' || seen.has(value)) return '';
  seen.add(value);

  const preferred = ['text', 'markdown', 'content', 'preview', 'message'];
  for (const key of preferred) {
    if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
  }

  if (Array.isArray(value)) {
    const parts = value.map(item => extractText(item, seen, depth + 1)).filter(Boolean);
    return parts.join('\n');
  }

  for (const key of ['payload', 'data', 'message', 'blocks', 'card', 'content']) {
    if (value[key] !== undefined) {
      const found = extractText(value[key], seen, depth + 1);
      if (found) return found;
    }
  }

  return '';
}

function isLikelyBotResponse(message) {
  const raw = JSON.stringify(message || {}).toLowerCase();
  return /incoming|bot|received|response/.test(raw);
}

function handleBotpressMessage(message) {
  if (!waitingForAI) return;

  console.debug('[DIVYANK TERMINAL] Botpress message:', message);
  const text = extractText(message);
  if (!text) return;

  const question = normalize(lastQuestion);
  const answer = normalize(text);
  if (!answer || answer === question) return;

  // Botpress message events cover both user and bot messages. If direction/type
  // is available, prefer incoming/bot events; otherwise accept the first
  // non-identical text payload after our request.
  if (!isLikelyBotResponse(message) && answer === question) return;

  clearResponseTimeout();
  waitingForAI = false;
  status.textContent = 'AI ONLINE';
  print([['ai', `AI  ${text}`]]);

  // Keep the transport alive but remove the visual Webchat surface.
  try { window.botpress.close(); } catch (_) {}
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
  status.textContent = 'AI ERROR';
  print([['warn', message]]);
}

function attachBotpress() {
  if (!window.botpress || typeof window.botpress.on !== 'function') {
    status.textContent = 'AI LOADING';
    setTimeout(attachBotpress, 150);
    return;
  }

  if (listenersAttached) return;
  listenersAttached = true;

  // Official Botpress events: message fires for sent/received messages and
  // wildcard receives all Webchat events.
  window.botpress.on('message', handleBotpressMessage);
  window.botpress.on('*', handleBotpressMessage);

  window.botpress.on('webchat:initialized', () => {
    status.textContent = 'AI ONLINE';
  });

  window.botpress.on('webchat:ready', () => {
    botpressReady = true;
    status.textContent = waitingForAI ? 'THINKING' : 'AI ONLINE';
    if (waitingForAI) sendPendingQuestion();
  });

  window.botpress.on('error', error => {
    console.error('[DIVYANK TERMINAL] Botpress error:', error);
    if (waitingForAI) failAI(`Botpress error: ${error?.message || 'connection error'}`);
  });

  // Generated embeds may finish before this script attaches listeners.
  if (typeof window.botpress.sendMessage === 'function') {
    botpressReady = true;
    status.textContent = 'AI ONLINE';
  }
}

function sendPendingQuestion() {
  if (!waitingForAI || !lastQuestion) return;
  if (typeof window.botpress?.sendMessage !== 'function') {
    failAI('Botpress is not ready to receive messages yet.');
    return;
  }

  window.botpress.sendMessage(lastQuestion).catch(error => {
    console.error('[DIVYANK TERMINAL] sendMessage failed:', error);
    failAI(`Botpress error: ${error?.message || 'message could not be sent'}`);
  });
}

function askAI(question) {
  if (!window.botpress || typeof window.botpress.on !== 'function') {
    print([['warn', 'AI assistant is still loading. Try again in a moment.']]);
    attachBotpress();
    return;
  }

  if (waitingForAI) {
    print([['muted', 'AI is still answering the previous question.']]);
    return;
  }

  waitingForAI = true;
  lastQuestion = question;
  status.textContent = 'THINKING';
  print([['muted', 'AI  thinking...']]);

  clearResponseTimeout();
  responseTimeout = setTimeout(() => {
    if (waitingForAI) {
      failAI('The AI responded through Botpress, but the terminal did not receive the response event.');
    }
  }, 30000);

  if (botpressReady && typeof window.botpress.sendMessage === 'function') {
    sendPendingQuestion();
    return;
  }

  if (typeof window.botpress.open !== 'function') {
    failAI('Botpress Webchat is not initialized yet. Refresh and try again.');
    return;
  }

  try {
    window.botpress.open();
  } catch (error) {
    failAI('Could not initialize the Botpress transport.');
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

attachBotpress();
