export const ROLES = {
  OWNER: 'owner',
  EDITOR: 'editor',
  VIEWER: 'viewer',
};

export const FILE_TYPES = {
  FILE: 'file',
  FOLDER: 'folder',
};

export const SOCKET_EVENTS = {
  // Presence
  WORKSPACE_JOIN: 'workspace:join',
  WORKSPACE_LEAVE: 'workspace:leave',
  WORKSPACE_PRESENCE: 'workspace:presence',
  WORKSPACE_USER_JOINED: 'workspace:user-joined',
  WORKSPACE_USER_LEFT: 'workspace:user-left',
  
  // File operations broadcast
  FILE_CREATED: 'file:created',
  FILE_RENAMED: 'file:renamed',
  FILE_DELETED: 'file:deleted',
  
  // Chat
  CHAT_SEND: 'chat:send',
  CHAT_MESSAGE: 'chat:message',
  CHAT_HISTORY: 'chat:history',
  
  // Workspace management
  WORKSPACE_UPDATED: 'workspace:updated',
  MEMBER_UPDATED: 'member:updated',
  MEMBER_REMOVED: 'member:removed',
};

export const DEFAULT_FILES = [
  {
    name: 'index.html',
    type: 'file',
    path: '/index.html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CodeSync Project</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="container">
    <div class="badge">Live Preview</div>
    <h1>Welcome to <span class="highlight">CodeSync</span></h1>
    <p>The real-time collaborative web code editor built for modern development teams.</p>
    
    <div class="card">
      <h2>Interactive Counter</h2>
      <p>Click the button below to test live JavaScript execution:</p>
      <div class="counter-display" id="countDisplay">0</div>
      <div class="button-group">
        <button id="decrementBtn" class="btn secondary">-</button>
        <button id="resetBtn" class="btn secondary">Reset</button>
        <button id="incrementBtn" class="btn primary">+</button>
      </div>
    </div>
  </div>

  <script src="script.js"></script>
</body>
</html>`,
  },
  {
    name: 'style.css',
    type: 'file',
    path: '/style.css',
    content: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background: #0f172a;
  color: #f8fafc;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
}

.container {
  max-width: 540px;
  width: 100%;
  text-align: center;
  animation: fadeIn 0.4s ease-out;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 16px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

h1 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: -0.025em;
}

.highlight {
  background: linear-gradient(135deg, #6366f1, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

p {
  color: #94a3b8;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 28px;
}

.card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.card h2 {
  font-size: 1.25rem;
  margin-bottom: 8px;
  color: #e2e8f0;
}

.card p {
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.counter-display {
  font-size: 3.5rem;
  font-weight: 800;
  color: #6366f1;
  margin: 12px 0 20px 0;
  font-variant-numeric: tabular-nums;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn.primary {
  background: #6366f1;
  color: white;
}

.btn.primary:hover {
  background: #4f46e5;
  transform: translateY(-1px);
}

.btn.secondary {
  background: #334155;
  color: #f1f5f9;
}

.btn.secondary:hover {
  background: #475569;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}`,
  },
  {
    name: 'script.js',
    type: 'file',
    path: '/script.js',
    content: `// CodeSync Interactive Starter Script
console.log('[CodeSync] Runtime preview initialized successfully!');
console.info('[CodeSync] Collaborating in real-time with Yjs and Monaco.');

let count = 0;
const display = document.getElementById('countDisplay');
const incBtn = document.getElementById('incrementBtn');
const decBtn = document.getElementById('decrementBtn');
const resetBtn = document.getElementById('resetBtn');

function updateDisplay() {
  if (display) {
    display.textContent = count;
  }
}

if (incBtn) {
  incBtn.addEventListener('click', () => {
    count++;
    updateDisplay();
    console.log(\`[Counter] Incremented to \${count}\`);
  });
}

if (decBtn) {
  decBtn.addEventListener('click', () => {
    count--;
    updateDisplay();
    console.log(\`[Counter] Decremented to \${count}\`);
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    count = 0;
    updateDisplay();
    console.warn('[Counter] Reset back to 0');
  });
}`,
  },
];
