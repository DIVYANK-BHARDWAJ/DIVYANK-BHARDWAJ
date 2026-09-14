const output = document.querySelector('#output');
const form = document.querySelector('#terminal-form');
const input = document.querySelector('#command');
const status = document.querySelector('#status');
const history = [];
let historyIndex = 0;
let botpressInitialized = false;
let botpressReady = false;
let botpressListenersAttached = false;
let waitingForAI = false;
let lastQuestion = '';
let responseTimeout = null;
let botpressPoll = null;
let diagnosticShown = false;

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

function welcome() {
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

  connectBotpress();
}

function connectBotpress() {
  if (botpressListenersAttached) return;

  if (!window.botpress || typeof window.botpress.on !== 'function') {
    status.textContent = 'AI LOADING';
    if (!botpressPoll) {
      botpressPoll = setInterval(connectBotpress, 150);
    }
    return;
  }

  botpressListenersAttached = true;
  if (botpressPoll) {
    clearInterval(botpressPoll);
    botpressPoll = null;
  }

  status.textContent = 'AI LOADING';

  try {
    // Attach the wildcard listener as a low-level diagnostic hook. It does not
    // change behavior; it lets us see if Botpress is emitting lifecycle events.
    window.botpress.on('*', (event) => {
      console.debug('[Botpress *]', event);
    });

    window.botpress.on('message', handleBotpressMessage);

    window.botpress.on('webchat:initialized', () => {
      botpressInitialized = true;
      status.textContent = waitingForAI ? 'THINKING' : 'AI ONLINE';
      console.debug('[Botpress] webchat:initialized');
      if (waitingForAI) openForQuestion();
    });

    window.botpress.on('webchat:ready', () => {
      botpressInitialized = true;
      botpressReady = true;
      status.textContent = waitingForAI ? 'THINKING' : 'AI ONLINE';
      console.debug('[Botpress] webchat:ready');
      if (waitingForAI) sendPendingQuestion();
    });

    window.botpress.on('webchat:opened', () => {
      console.debug('[Botpress] webchat:opened');
    });

    window.botpress.on('webchat:closed', () => {
      console.debug('[Botpress] webchat:closed');
    });

    window.botpress.on('conversation', (event) => {
      console.debug('[Botpress] conversation:', event);
    });

    window.botpress.on('error', (error) => {
      console.error('[Botpress] error:', error);
      if (waitingForAI) {
        failAI(formatBotpressError(error));
      } else {
        status.textContent = 'AI ERROR';
        showDiagnosticOnce(formatBotpressError(error));
      }
    });

    // The generated Botpress bundle can initialize before our listener is
    // attached. If the sendMessage API is already present, Webchat is ready
    // even if the ready event was missed.
    detectAlreadyReady();
  } catch (error) {
    console.error('Botpress connection setup failed:', error);
    botpressListenersAttached = false;
    status.textContent = 'AI ERROR';
    showDiagnosticOnce('Could not attach to the Botpress Webchat API.');
  }
}

function detectAlreadyReady() {
  try {
    const api = window.botpress;
    const hasSendMessage = typeof api?.sendMessage === 'function';
    const hasOpen = typeof api?.open === 'function';
    const initialized = api?.initialized === true;

    if (initialized || hasSendMessage) {
      botpressInitialized = true;
    }
    if (hasSendMessage) {
      botpressReady = true;
      status.textContent = 'AI ONLINE';
    }

    console.debug('[Botpress] API state', {
      initialized,
      hasOn: typeof api?.on === 'function',
      hasOpen,
      hasSendMessage,
    });
  } catch (error) {
    console.debug('[Botpress] state probe failed:', error);
  }
}

function openForQuestion() {
  if (!waitingForAI) return;

  try {
    if (typeof window.botpress.open !== 'function') {
      failAI('Botpress initialized, but the Webchat open API is unavailable.');
      return;
    }

    window.botpress.open();

    // If the ready event was missed, probe for sendMessage briefly. This also
    // handles generated embeds whose initialization completes before our
    // listener is registered.
    const startedAt = Date.now();
    const probe = setInterval(() => {
      if (!waitingForAI) {
        clearInterval(probe);
        return;
      }

      if (typeof window.botpress.sendMessage === 'function') {
        clearInterval(probe);
        botpressReady = true;
        sendPendingQuestion();
        return;
      }

      if (Date.now() - startedAt > 10000) {
        clearInterval(probe);
        failAI('Botpress Webchat opened but never became ready. Check the bot publish status, Client ID, and Allowed Origins for this GitHub Pages domain.');
      }
    }, 250);
  } catch (error) {
    console.error('[Botpress] open failed:', error);
    failAI('Botpress Webchat could not be opened. Check the Webchat configuration.');
  }
}

function clearResponseTimeout() {
  if (responseTimeout) {
    clearTimeout(responseTimeout);
    responseTimeout = null;
  }
}

function handleBotpressMessage(message) {
  console.debug('Botpress message event:', message);
  if (!waitingForAI) return;

  const text = extractBotpressText(message);
  if (!text) return;

  // The Webchat message event fires for both user and bot messages.
  // Ignore the user's own echoed question and accept the bot response.
  if (normalize(text) === normalize(lastQuestion)) return;

  clearResponseTimeout();
  waitingForAI = false;
  status.textContent = 'AI ONLINE';
  print([['ai', `AI  ${text}`]]);

  try { window.botpress.close(); } catch (_) {}
}

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function extractBotpressText(message) {
  const candidates = [
    message,
    message?.data,
    message?.message,
    message?.payload,
    message?.data?.payload,
    message?.message?.payload,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === 'string') return candidate;
    if (typeof candidate.text === 'string') return candidate.text;
    if (typeof candidate.markdown === 'string') return candidate.markdown;
    if (candidate.payload && typeof candidate.payload.text === 'string') return candidate.payload.text;
    if (candidate.payload && typeof candidate.payload.markdown === 'string') return candidate.payload.markdown;

    if (Array.isArray(candidate.blocks)) {
      const text = candidate.blocks
        .map(block => block?.text || block?.markdown || block?.payload?.text || '')
        .filter(Boolean)
        .join('\n');
      if (text) return text;
    }
  }

  return '';
}

async function sendPendingQuestion() {
  if (!waitingForAI || !lastQuestion) return;
  if (!window.botpress || typeof window.botpress.sendMessage !== 'function') {
    failAI('Botpress is not ready to receive messages yet.');
    return;
  }

  const question = lastQuestion;

  try {
    await window.botpress.sendMessage(question);
  } catch (error) {
    console.error('Botpress message failed:', error);
    failAI(formatBotpressError(error));
  }
}

function formatBotpressError(error) {
  const raw = error?.message || error?.error || error?.reason || '';
  if (raw) return `Botpress error: ${raw}`;
  return 'Botpress reported a connection error. Check the bot publish status, Client ID, and Allowed Origins.';
}

function showDiagnosticOnce(message) {
  if (diagnosticShown) return;
  diagnosticShown = true;
  print([
    ['warn', message],
    ['muted', 'The terminal transport is waiting for a healthy Botpress Webchat connection.'],
  ]);
}

function failAI(message) {
  clearResponseTimeout();
  waitingForAI = false;
  status.textContent = 'AI ERROR';
  print([['warn', message]]);
}

async function askAI(question) {
  if (!window.botpress || typeof window.botpress.on !== 'function') {
    print([
      ['warn', 'AI assistant is still loading.'],
      ['muted', 'Wait a moment and try again.'],
    ]);
    connectBotpress();
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
    if (!waitingForAI) return;
    failAI('No response was received from Botpress within 30 seconds. The Webchat connection is not healthy.');
  }, 30000);

  try {
    detectAlreadyReady();

    if (botpressReady && typeof window.botpress.sendMessage === 'function') {
      await sendPendingQuestion();
      return;
    }

    if (!botpressInitialized) {
      // The generated embed normally emits webchat:initialized first. If that
      // event was missed, open() is still safe once the method exists.
      openForQuestion();
      return;
    }

    openForQuestion();
  } catch (error) {
    console.error('Botpress open/send failed:', error);
    failAI('The AI connection could not be opened. Check the Webchat configuration.');
  }
}

function isNaturalLanguageQuestion(raw) {
  const words = raw.trim().split(/\s+/);
  return words.length >= 3 || /[?!.,]/.test(raw);
}

form.addEventListener('submit', async (event) => {
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
    if (!remainder) {
      print([['warn', 'Usage: ask <your question>']]);
      return;
    }
    await askAI(remainder);
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

  await askAI(raw);
});

input.addEventListener('keydown', (event) => {
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
welcome();
