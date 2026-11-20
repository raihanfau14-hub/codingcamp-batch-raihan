/* =============================================
   Personal Dashboard - app.js
   ============================================= */

// ── Utility ──────────────────────────────────

function $(id) { return document.getElementById(id); }

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadFromStorage(key, fallback) {
  const val = localStorage.getItem(key);
  return val !== null ? JSON.parse(val) : fallback;
}

// ── Theme ─────────────────────────────────────

const THEME_KEY = 'dashboard_theme';

function initTheme() {
  const saved = loadFromStorage(THEME_KEY, 'light');
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  saveToStorage(THEME_KEY, theme);
  const icon = theme === 'dark' ? '☀️' : '🌙';
  const label = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  $('theme-toggle').innerHTML = `${icon} ${label}`;
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ── Greeting ──────────────────────────────────

const NAME_KEY = 'dashboard_name';

function initGreeting() {
  const name = loadFromStorage(NAME_KEY, '');
  if (name) $('name-input').value = name;
  updateGreeting();
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  $('clock').textContent = `${hours}:${minutes}:${seconds}`;

  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  $('date').textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

function updateGreeting() {
  const hour = new Date().getHours();
  let greeting;
  if (hour >= 5 && hour < 12)       greeting = 'Good morning';
  else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17 && hour < 21) greeting = 'Good evening';
  else                               greeting = 'Good night';

  const name = loadFromStorage(NAME_KEY, '').trim();
  const nameHtml = name ? `, <span>${name}</span>` : '';
  $('greeting-text').innerHTML = `${greeting}${nameHtml} 👋`;
}

function saveName() {
  const name = $('name-input').value.trim();
  saveToStorage(NAME_KEY, name);
  updateGreeting();
  showToast(name ? `Name saved as "${name}"!` : 'Name cleared.');
}

// ── Focus Timer ───────────────────────────────

const TIMER_KEY = 'dashboard_timer_minutes';
const DEFAULT_MINUTES = 25;

let timerInterval = null;
let timerRunning = false;
let totalSeconds = 0;
let remainingSeconds = 0;

function initTimer() {
  const saved = loadFromStorage(TIMER_KEY, DEFAULT_MINUTES);
  $('pomodoro-minutes').value = saved;
  resetTimer(false);
}

function getTimerMinutes() {
  const val = parseInt($('pomodoro-minutes').value, 10);
  return (isNaN(val) || val < 1) ? DEFAULT_MINUTES : val;
}

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function updateTimerDisplay() {
  const display = $('timer-display');
  display.textContent = formatTime(remainingSeconds);
  const pct = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 100;
  $('timer-progress').style.width = pct + '%';

  display.classList.remove('running', 'finished');
  if (timerRunning) display.classList.add('running');
  else if (remainingSeconds === 0 && totalSeconds > 0) display.classList.add('finished');
}

function startTimer() {
  if (timerRunning) return;
  if (remainingSeconds === 0) resetTimer(false);
  timerRunning = true;
  $('btn-start').disabled = true;
  $('btn-stop').disabled = false;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();
    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      $('btn-start').disabled = false;
      $('btn-stop').disabled = true;
      showToast('⏰ Focus session complete!');
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  $('btn-start').disabled = false;
  $('btn-stop').disabled = true;
  updateTimerDisplay();
}

function resetTimer(notify = true) {
  clearInterval(timerInterval);
  timerRunning = false;
  const mins = getTimerMinutes();
  totalSeconds = mins * 60;
  remainingSeconds = totalSeconds;
  $('btn-start').disabled = false;
  $('btn-stop').disabled = true;
  updateTimerDisplay();
  if (notify) showToast('Timer reset.');
}

function savePomodoro() {
  const mins = getTimerMinutes();
  saveToStorage(TIMER_KEY, mins);
  resetTimer(false);
  showToast(`Pomodoro set to ${mins} minutes.`);
}

// ── To-Do List ────────────────────────────────

const TODO_KEY = 'dashboard_todos';
let todos = [];
let sortOrder = 'default';

function initTodos() {
  todos = loadFromStorage(TODO_KEY, []);
  renderTodos();
}

function saveTodos() {
  saveToStorage(TODO_KEY, todos);
}

function getSortedTodos() {
  const copy = [...todos];
  if (sortOrder === 'az') copy.sort((a, b) => a.text.localeCompare(b.text));
  else if (sortOrder === 'za') copy.sort((a, b) => b.text.localeCompare(a.text));
  else if (sortOrder === 'pending') copy.sort((a, b) => a.done - b.done);
  else if (sortOrder === 'done') copy.sort((a, b) => b.done - a.done);
  return copy;
}

function addTodo() {
  const input = $('todo-input');
  const text = input.value.trim();
  if (!text) return;

  // Challenge: Prevent duplicate tasks (case-insensitive)
  const isDuplicate = todos.some(t => t.text.toLowerCase() === text.toLowerCase());
  if (isDuplicate) {
    $('duplicate-warning').classList.add('visible');
    input.style.borderColor = 'var(--warning)';
    setTimeout(() => {
      $('duplicate-warning').classList.remove('visible');
      input.style.borderColor = '';
    }, 2500);
    return;
  }

  todos.push({ id: Date.now(), text, done: false });
  saveTodos();
  renderTodos();
  input.value = '';
  $('duplicate-warning').classList.remove('visible');
  input.style.borderColor = '';
}

function toggleDone(id) {
  const t = todos.find(t => t.id === id);
  if (t) { t.done = !t.done; saveTodos(); renderTodos(); }
}

function deleteTask(id) {
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  renderTodos();
}

function startEdit(id) {
  const item = document.querySelector(`.todo-item[data-id="${id}"]`);
  if (!item) return;
  const task = todos.find(t => t.id === id);
  if (!task) return;

  const textEl = item.querySelector('.task-text');
  const editEl = document.createElement('input');
  editEl.type = 'text';
  editEl.value = task.text;
  editEl.className = 'task-text-edit';

  textEl.replaceWith(editEl);
  editEl.focus();
  editEl.select();

  const saveEdit = () => {
    const newText = editEl.value.trim();
    if (newText && newText !== task.text) {
      const dup = todos.some(t => t.id !== id && t.text.toLowerCase() === newText.toLowerCase());
      if (dup) { showToast('⚠️ That task already exists!'); editEl.focus(); return; }
      task.text = newText;
      saveTodos();
    }
    renderTodos();
  };

  editEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') renderTodos();
  });
  editEl.addEventListener('blur', saveEdit);
}

function renderTodos() {
  const list = $('todo-list');
  const sorted = getSortedTodos();

  if (sorted.length === 0) {
    list.innerHTML = '<li class="todo-empty">No tasks yet. Add one above!</li>';
    return;
  }

  list.innerHTML = '';
  sorted.forEach(task => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (task.done ? ' done' : '');
    li.dataset.id = task.id;
    li.innerHTML = `
      <input type="checkbox" ${task.done ? 'checked' : ''} title="Mark done" aria-label="Mark done">
      <span class="task-text">${escapeHtml(task.text)}</span>
      <div class="todo-item-actions">
        <button class="btn btn-ghost btn-sm edit-btn" title="Edit">✏️</button>
        <button class="btn btn-danger btn-sm del-btn" title="Delete">🗑️</button>
      </div>`;

    li.querySelector('input[type="checkbox"]').addEventListener('change', () => toggleDone(task.id));
    li.querySelector('.edit-btn').addEventListener('click', () => startEdit(task.id));
    li.querySelector('.del-btn').addEventListener('click', () => deleteTask(task.id));
    list.appendChild(li);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Quick Links ───────────────────────────────

const LINKS_KEY = 'dashboard_links';

const DEFAULT_LINKS = [
  { id: 1, label: 'Google', url: 'https://google.com', icon: '🔍' },
  { id: 2, label: 'YouTube', url: 'https://youtube.com', icon: '▶️' },
  { id: 3, label: 'GitHub', url: 'https://github.com', icon: '🐙' },
  { id: 4, label: 'Gmail', url: 'https://mail.google.com', icon: '📧' },
];

let links = [];

function initLinks() {
  links = loadFromStorage(LINKS_KEY, DEFAULT_LINKS);
  renderLinks();
}

function saveLinks() {
  saveToStorage(LINKS_KEY, links);
}

function addLink() {
  const label = $('link-label').value.trim();
  const url   = $('link-url').value.trim();
  const icon  = $('link-icon').value.trim() || '🔗';

  if (!label || !url) { showToast('Please fill in both name and URL.'); return; }

  let formattedUrl = url;
  if (!/^https?:\/\//i.test(url)) formattedUrl = 'https://' + url;

  links.push({ id: Date.now(), label, url: formattedUrl, icon });
  saveLinks();
  renderLinks();
  $('link-label').value = '';
  $('link-url').value = '';
  $('link-icon').value = '';
  showToast(`"${label}" added!`);
}

function deleteLink(id) {
  links = links.filter(l => l.id !== id);
  saveLinks();
  renderLinks();
}

function renderLinks() {
  const grid = $('links-grid');
  const manage = $('links-manage');
  grid.innerHTML = '';
  manage.innerHTML = '';

  if (links.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-secondary);font-size:0.85rem;grid-column:1/-1">No links yet.</p>';
  }

  links.forEach(link => {
    // Shortcut button
    const a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'link-btn';
    a.innerHTML = `<span class="link-icon">${link.icon}</span>${escapeHtml(link.label)}`;
    grid.appendChild(a);

    // Manage row
    const row = document.createElement('div');
    row.className = 'link-item-manage';
    row.innerHTML = `<span>${link.icon} ${escapeHtml(link.label)} — <em>${escapeHtml(link.url)}</em></span>`;
    const del = document.createElement('button');
    del.className = 'btn btn-danger btn-sm';
    del.textContent = '🗑️ Remove';
    del.addEventListener('click', () => deleteLink(link.id));
    row.appendChild(del);
    manage.appendChild(row);
  });
}

// ── Event Listeners ───────────────────────────

function initEvents() {
  // Theme
  $('theme-toggle').addEventListener('click', toggleTheme);

  // Greeting / Name
  $('save-name').addEventListener('click', saveName);
  $('name-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveName(); });

  // Timer buttons
  $('btn-start').addEventListener('click', startTimer);
  $('btn-stop').addEventListener('click', stopTimer);
  $('btn-reset').addEventListener('click', () => resetTimer(true));
  $('btn-set-pomodoro').addEventListener('click', savePomodoro);

  // To-Do
  $('btn-add-task').addEventListener('click', addTodo);
  $('todo-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTodo(); });
  $('todo-input').addEventListener('input', () => {
    $('duplicate-warning').classList.remove('visible');
    $('todo-input').style.borderColor = '';
  });
  $('sort-select').addEventListener('change', (e) => {
    sortOrder = e.target.value;
    renderTodos();
  });

  // Quick Links
  $('btn-add-link').addEventListener('click', addLink);
  $('link-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') addLink(); });
}

// ── Init ──────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initGreeting();
  initTimer();
  initTodos();
  initLinks();
  initEvents();
});
