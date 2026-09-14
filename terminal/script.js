const output = document.querySelector('#output');
const form = document.querySelector('#terminal-form');
const input = document.querySelector('#command');
const status = document.querySelector('#status');
const history = [];
let historyIndex = 0;
let botpressReady = false;
let botpressListenersAttached = false;
let waitingForAI = false;

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
    ['', 'clear            Clear terminal'],
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

  if (!window.botpress) {
    status.textContent = 'AI LOADING';
    setTimeout(connectBotpress, 150);
    return;
  }

  botpressListenersAttached = true;
  status.textContent = 'AI LOADING';

  try {
    window.botpress.on('webchat:ready', () => {
      botpressReady = true;
      status.textContent = 'AI ONLINE';
      print([['success', 'AI assistant connected. Ask anything about Divyank.']]);
      try { window.botpress.close(); } catch (_) {}
    });

    window.botpress.on('message', (message) => {
      const direction = message?.direction;
      if (direction && direction !== 'outgoing') return;

      const text = extractBotpressText(message);
      if (!text || !waitingForAI) return;

      waitingForAI = false;
      status.textContent = 'AI ONLINE';
      print([['ai', `AI  ${text}`]]);
    });

    window.botpress.on('error', (error) => {
      console.error('Botpress error:', error);
      waitingForAI = false;
      status.textContent = botpressReady ? 'AI ONLINE' : 'AI ERROR';
    });

    // The published Botpress Webchat v3.7 embed initializes itself.
    // If it is already initialized before our listener attaches, use the
    // presence of sendMessage as a fallback readiness signal.
    if (typeof window.botpress.sendMessage === 'function') {
      botpressReady = true;
      status.textContent = 'AI ONLINE';
      try { window.botpress.close(); } catch (_) {}
    }
  } catch (error) {
    console.error('Botpress connection setup failed:', error);
    botpressListenersAttached = false;
    status.textContent = 'AI ERROR';
  }
}

function extractBotpressText(message) {
  const payload = message?.payload || {};
  if (typeof payload.text === 'string') return payload.text;
  if (typeof message?.text === 'string') return message.text;
  if (typeof payload.markdown === 'string') return payload.markdown;
  if (Array.isArray(payload.blocks)) {
    return payload.blocks
      .map(block => block?.text || block?.markdown || '')
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

async function askAI(question) {
  if (!botpressReady || typeof window.botpress?.sendMessage !== 'function') {
    print([
      ['warn', 'AI assistant is not connected yet.'],
      ['muted', 'Wait for the terminal status to show AI ONLINE, then try again.'],
    ]);
    connectBotpress();
    return;
  }

  if (waitingForAI) {
    print([['muted', 'AI is still answering the previous question.']]);
    return;
  }

  waitingForAI = true;
  status.textContent = 'THINKING';
  print([['muted', 'AI  thinking...']]);

  try {
    await window.botpress.sendMessage(question);
  } catch (error) {
    console.error('Botpress message failed:', error);
    waitingForAI = false;
    status.textContent = 'AI ONLINE';
    print([['warn', 'The AI could not process that message. Try again.']]);
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

  if (botpressReady) {
    await askAI(raw);
    return;
  }

  print([
    ['warn', `command not found: ${command}`],
    ['muted', 'The AI is still connecting. Try again in a moment.'],
  ]);
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
