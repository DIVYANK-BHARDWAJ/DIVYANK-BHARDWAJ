const output = document.querySelector('#output');
const form = document.querySelector('#terminal-form');
const input = document.querySelector('#command');
const history = [];
let historyIndex = 0;

const commands = {
  help: () => [
    ['accent', 'Available commands'],
    ['', 'about       About Divyank'],
    ['', 'skills      Languages and tools'],
    ['', 'projects    Featured engineering projects'],
    ['', 'repos       GitHub repositories'],
    ['', 'journey     Current engineering journey'],
    ['', 'education   Education'],
    ['', 'hackathons  Hackathon and collaboration focus'],
    ['', 'contact     Contact / social links'],
    ['', 'github      Open GitHub profile'],
    ['', 'clear       Clear terminal'],
  ],
  about: () => [
    ['accent', 'DIVYANK BHARDWAJ'],
    ['', 'Computer Science Engineering student and builder.'],
    ['', 'Focused on software engineering, web development, AI/ML,'],
    ['', 'systems, cloud infrastructure and learning how things work'],
    ['', 'behind the abstractions.'],
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
    ['', 'Engineering   Git • GitHub • GitLab • GitHub Actions • Postman'],
    ['', 'Design        Figma • Notion • Jira'],
  ],
  projects: () => [
    ['accent', 'FEATURED PROJECTS'],
    ['', 'NOVIQ        AI-native distributed systems — flagship build'],
    ['', 'JANVISTA AI  AI-native public infrastructure intelligence'],
    ['', 'ARGUS        AI / systems engineering project'],
    ['', ''],
    ['muted', 'Use "repos" to explore the GitHub side of the portfolio.'],
  ],
  repos: () => [
    ['accent', 'GITHUB'],
    ['', 'Profile: github.com/DIVYANK-BHARDWAJ'],
    ['', 'Explore the repositories, source code and ongoing builds.'],
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
    ['', 'B.E. / B.Tech — Computer Science & Engineering'],
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
    ['', 'Welcome. Type "help" to explore the portfolio.'],
    ['muted', 'Tip: try about, skills, projects, repos or journey.'],
    ['', ''],
  ]);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const raw = input.value.trim();
  if (!raw) return;
  history.push(raw);
  historyIndex = history.length;
  print([['muted', `divyank@github:~$ ${raw}`]]);

  const command = raw.toLowerCase().split(/\s+/)[0];
  if (commands[command]) {
    print(commands[command]());
  } else {
    print([
      ['warn', `command not found: ${command}`],
      ['muted', 'Type "help" to see available commands.'],
    ]);
  }
  input.value = '';
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
