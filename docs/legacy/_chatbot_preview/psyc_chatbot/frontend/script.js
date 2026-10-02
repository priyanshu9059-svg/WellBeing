/**
 * Aria — Frontend JavaScript
 *
 * Handles: session lifecycle, message sending, typing indicator,
 * emotion/risk rendering, crisis banner, and auto-resizing textarea.
 */

'use strict';

// ── Config ────────────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:8000';

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  sessionId: null,
  isLoading: false,
  lastRisk: 'low',
  lastEmotion: 'neutral',
  crisisDismissed: false,
};

// ── DOM refs ──────────────────────────────────────────────────────────────────

const dom = {
  welcomeScreen:    document.getElementById('welcomeScreen'),
  beginBtn:         document.getElementById('beginBtn'),
  newSessionBtn:    document.getElementById('newSessionBtn'),
  messages:         document.getElementById('messages'),
  inputArea:        document.getElementById('inputArea'),
  messageInput:     document.getElementById('messageInput'),
  sendBtn:          document.getElementById('sendBtn'),
  charCount:        document.getElementById('charCount'),
  crisisBanner:     document.getElementById('crisisBanner'),
  crisisClose:      document.getElementById('crisisClose'),
  statusBadge:      document.getElementById('statusBadge'),
  statusDot:        document.querySelector('.status-dot'),
  statusLabel:      document.querySelector('.status-label'),
  emotionIndicator: document.getElementById('emotionIndicator'),
};

// ── Emotion → colour map ──────────────────────────────────────────────────────

const EMOTION_COLOURS = {
  happy:      '#7A9E9B',
  calm:       '#5A8A7A',
  anxious:    '#C0A060',
  stressed:   '#C08050',
  sad:        '#9080B0',
  distressed: '#C07060',
  angry:      '#B04040',
  hopeless:   '#8050A0',
  neutral:    '#B8A898',
};

const EMOTION_ICONS = {
  happy:      '☀️',
  calm:       '🌿',
  anxious:    '🌀',
  stressed:   '⚡',
  sad:        '🌧',
  distressed: '🌊',
  angry:      '🔥',
  hopeless:   '🌑',
  neutral:    '◦',
};

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function startSession() {
  return apiRequest('/chat/start', { method: 'POST' });
}

async function sendMessage(sessionId, message) {
  return apiRequest('/chat/message', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, message }),
  });
}

// ── Session management ────────────────────────────────────────────────────────

async function initSession() {
  setStatus('connecting', 'Connecting…');
  try {
    const data = await startSession();
    state.sessionId = data.session_id;
    setStatus('online', 'Here for you');

    // Show chat UI
    dom.welcomeScreen.style.opacity = '0';
    dom.welcomeScreen.style.transform = 'scale(0.96)';
    dom.welcomeScreen.style.transition = 'all 0.4s ease';
    setTimeout(() => { dom.welcomeScreen.hidden = true; }, 400);
    dom.inputArea.hidden = false;
    dom.inputArea.style.animation = 'msgEnter 0.4s ease both';

    // Show greeting
    appendBotMessage(data.message, {
      emotion: 'calm',
      risk_level: 'low',
      confidence: 1.0,
      follow_up: true,
      conversation_turn: 0,
    });

    dom.messageInput.focus();
  } catch (err) {
    setStatus('error', 'Connection failed');
    showErrorMessage(`Could not connect to Aria. Make sure the backend is running.\n\n${err.message}`);
  }
}

async function resetSession() {
  // Clear UI
  dom.messages.innerHTML = '';
  dom.crisisBanner.hidden = true;
  state.crisisDismissed = false;
  state.lastRisk = 'low';
  state.lastEmotion = 'neutral';
  updateEmotionIndicator('neutral');

  state.sessionId = null;
  dom.inputArea.hidden = true;
  dom.welcomeScreen.hidden = false;
  dom.welcomeScreen.style.opacity = '1';
  dom.welcomeScreen.style.transform = 'scale(1)';
}

// ── Message sending ───────────────────────────────────────────────────────────

async function handleSend() {
  const text = dom.messageInput.value.trim();
  if (!text || state.isLoading || !state.sessionId) return;

  // Append user bubble
  appendUserMessage(text);
  dom.messageInput.value = '';
  resizeTextarea();
  updateCharCount();
  dom.sendBtn.disabled = true;

  // Show typing
  const typingEl = showTyping();
  state.isLoading = true;

  try {
    const data = await sendMessage(state.sessionId, text);
    removeTyping(typingEl);
    appendBotMessage(data.reply, data);
    updateEmotionIndicator(data.emotion);
    state.lastRisk = data.risk_level;
    state.lastEmotion = data.emotion;

    if (data.risk_level === 'crisis' && !state.crisisDismissed) {
      showCrisisBanner();
    }
  } catch (err) {
    removeTyping(typingEl);
    showErrorMessage(`Something went wrong: ${err.message}`);
  } finally {
    state.isLoading = false;
    dom.sendBtn.disabled = !dom.messageInput.value.trim();
    dom.messageInput.focus();
  }
}

// ── DOM builders ──────────────────────────────────────────────────────────────

function appendUserMessage(text) {
  const row = document.createElement('div');
  row.className = 'message-row user';
  row.innerHTML = `
    <div class="bubble">
      ${escapeHtml(text)}
    </div>`;
  dom.messages.appendChild(row);
  scrollToBottom();
}

function appendBotMessage(text, meta) {
  const row = document.createElement('div');
  row.className = 'message-row bot';

  const emotion  = meta?.emotion     || 'neutral';
  const risk     = meta?.risk_level  || 'low';
  const conf     = meta?.confidence  || 0;
  const followUp = meta?.follow_up   || false;
  const time     = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const icon     = EMOTION_ICONS[emotion] || '◦';

  row.innerHTML = `
    <div class="bot-avatar" aria-hidden="true">🌿</div>
    <div>
      <div class="bubble ${followUp ? 'has-followup' : ''}">
        ${formatBotText(text)}
      </div>
      <div class="bubble-meta">
        <span class="emotion-tag emotion-${emotion}">${icon} ${emotion}</span>
        <span class="risk-tag risk-${risk}">${risk}</span>
        <span class="bubble-time">${time}</span>
      </div>
    </div>`;

  dom.messages.appendChild(row);
  scrollToBottom();
}

function showTyping() {
  const row = document.createElement('div');
  row.className = 'typing-row';
  row.id = 'typingIndicator';
  row.setAttribute('aria-label', 'Aria is typing');
  row.innerHTML = `
    <div class="bot-avatar" aria-hidden="true">🌿</div>
    <div class="typing-bubble">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>`;
  dom.messages.appendChild(row);
  scrollToBottom();
  return row;
}

function removeTyping(el) {
  if (el && el.parentNode) {
    el.style.opacity = '0';
    el.style.transform = 'scale(0.95)';
    el.style.transition = 'all 0.2s ease';
    setTimeout(() => el.remove(), 200);
  }
}

function showErrorMessage(text) {
  const row = document.createElement('div');
  row.className = 'message-row bot';
  row.innerHTML = `
    <div class="bot-avatar" aria-hidden="true">🌿</div>
    <div class="bubble" style="border-color:rgba(160,80,64,0.3);color:var(--text-muted);font-size:13px;">
      ${escapeHtml(text)}
    </div>`;
  dom.messages.appendChild(row);
  scrollToBottom();
}

// ── Crisis banner ─────────────────────────────────────────────────────────────

function showCrisisBanner() {
  dom.crisisBanner.hidden = false;
}

dom.crisisClose.addEventListener('click', () => {
  dom.crisisBanner.hidden = true;
  state.crisisDismissed = true;
});

// ── Emotion indicator bar ─────────────────────────────────────────────────────

function updateEmotionIndicator(emotion) {
  const colour = EMOTION_COLOURS[emotion] || EMOTION_COLOURS.neutral;
  dom.emotionIndicator.style.background = `linear-gradient(90deg, ${colour}60, ${colour}, ${colour}60)`;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function setStatus(state_, label) {
  const colours = {
    online:      'var(--teal)',
    connecting:  '#C0A060',
    error:       '#B05040',
  };
  dom.statusDot.style.background = colours[state_] || colours.online;
  dom.statusLabel.textContent     = label;
}

// ── Textarea auto-resize ──────────────────────────────────────────────────────

function resizeTextarea() {
  const el = dom.messageInput;
  el.style.height = '22px';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function updateCharCount() {
  const len = dom.messageInput.value.length;
  dom.charCount.textContent = `${len} / 2000`;
  dom.charCount.className = 'char-count' +
    (len > 1800 ? ' danger' : len > 1500 ? ' warn' : '');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scrollToBottom() {
  requestAnimationFrame(() => {
    dom.messages.scrollTop = dom.messages.scrollHeight;
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatBotText(text) {
  // Escape then restore newlines as <br>, detect trailing question
  let escaped = escapeHtml(text);
  escaped = escaped.replace(/\n/g, '<br>');
  // Highlight the last sentence if it ends with '?'
  escaped = escaped.replace(
    /([^.!?<br>][^<]*\?)(<br>)*$/,
    '<em style="color:var(--earth-deep);font-style:italic;">$1</em>$2'
  );
  return escaped;
}

// ── Event listeners ───────────────────────────────────────────────────────────

dom.beginBtn.addEventListener('click', initSession);

dom.newSessionBtn.addEventListener('click', () => {
  if (state.isLoading) return;
  if (state.sessionId) {
    if (confirm('Start a new conversation? This will clear the current one.')) {
      resetSession();
    }
  }
});

dom.messageInput.addEventListener('input', () => {
  resizeTextarea();
  updateCharCount();
  dom.sendBtn.disabled = !dom.messageInput.value.trim() || state.isLoading;
});

dom.messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!dom.sendBtn.disabled) handleSend();
  }
});

dom.sendBtn.addEventListener('click', handleSend);

// ── Init ──────────────────────────────────────────────────────────────────────

// Initialise emotion bar to neutral
updateEmotionIndicator('neutral');
