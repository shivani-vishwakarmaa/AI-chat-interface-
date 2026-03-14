/* ═══════════════════════════════════════════════════════════════
   script.js  —  AI Chat Interface v2
   Features: multi-conversation sidebar, delete chat, copy message,
             Markdown rendering, avatars, smooth animations,
             dark/light mode, full localStorage persistence.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

/* ──────────────────────────────────────────────────────────────
   1. DOM REFERENCES
────────────────────────────────────────────────────────────── */
const chatMessages   = document.getElementById("chatMessages");
const messageInput   = document.getElementById("messageInput");
const sendBtn        = document.getElementById("sendBtn");
const themeToggle    = document.getElementById("themeToggle");
const themeLabel     = document.getElementById("themeLabel");
const scrollFab      = document.getElementById("scrollFab");
const charCount      = document.getElementById("charCount");
const convList       = document.getElementById("convList");
const btnNewChat     = document.getElementById("btnNewChat");
const btnDeleteChat  = document.getElementById("btnDeleteChat");
const headerTitle    = document.getElementById("headerTitle");
const sidebar        = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const btnHamburger   = document.getElementById("btnHamburger");

/* ──────────────────────────────────────────────────────────────
   2. LOCAL-STORAGE KEYS
────────────────────────────────────────────────────────────── */
const LS_CONVS     = "aic_conversations";   // array of conversation objects
const LS_ACTIVE    = "aic_active_conv";     // id of current conversation
const LS_THEME     = "aic_theme";           // "dark" | "light"

/* ──────────────────────────────────────────────────────────────
   3. SIMULATED AI RESPONSES
   In production, replace pickAIResponse() with an API call.
────────────────────────────────────────────────────────────── */
const AI_RESPONSES = [
  "That's a great question! Let me think through it carefully.\n\n**Short answer:** there are a few ways to approach this.\n\n1. Start with the fundamentals\n2. Build incrementally\n3. Test your assumptions early\n\nWould you like me to elaborate on any of these?",
  "Interesting! Here's a quick breakdown:\n\n```js\n// Example snippet\nconst result = data.filter(x => x.active)\n  .map(x => x.value);\n```\n\nThis pattern is quite efficient for most use cases.",
  "Great point. There are a few trade-offs worth considering:\n\n| Approach | Pros | Cons |\n|---|---|---|\n| Option A | Fast | Complex |\n| Option B | Simple | Slower |\n\nWhat matters most for your use case?",
  "I appreciate you sharing that. Here's what I'd suggest:\n\n> Start simple, then optimise. Premature optimisation is the root of all evil.\n\nFocus on correctness first, then measure before you tune.",
  "Absolutely! The key insight here is that **context matters a lot**. What works in one scenario might not translate directly to another.\n\nThat said, some *universal principles* apply:\n- Keep it simple\n- Make it readable\n- Document your decisions",
  "Sure thing! Let me walk you through it step by step so it's easy to follow.",
  "Good thinking — you're on the right track. Just a couple of small adjustments and you'll be there.",
  "This is actually a nuanced topic. In short: **it depends**, but the most robust approach is usually to prioritise clarity over cleverness.",
  "Happy to help! Here's a concise summary:\n\n**TL;DR** — The best approach combines simplicity with good defaults, then layers in complexity only where needed.",
  "That's perfectly valid reasoning. The main thing to watch out for is scope creep — keep your goals tight and iterate.",
];

let aiResponseIdx = 0;
function pickAIResponse() {
  return AI_RESPONSES[aiResponseIdx++ % AI_RESPONSES.length];
}

/* ──────────────────────────────────────────────────────────────
   4. MARKDOWN RENDERER
   Uses marked.js (loaded in <head>). Configured for safety.
────────────────────────────────────────────────────────────── */
function renderMarkdown(text) {
  if (typeof marked === "undefined") {
    // Fallback: plain text with newlines preserved
    return text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }
  // Configure marked: GFM + breaks, but sanitise output
  return marked.parse(text, {
    gfm:    true,
    breaks: true,
    mangle: false,
    headerIds: false,
  });
}

/* ──────────────────────────────────────────────────────────────
   5. DATA MODEL
   conversations: [
     {
       id:        string (uuid-lite),
       title:     string,
       createdAt: ISO string,
       messages:  [{ role, text, timestamp }]
     }
   ]
────────────────────────────────────────────────────────────── */

function uid() {
  // Simple unique id — good enough for localStorage keys
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadConversations() {
  try { return JSON.parse(localStorage.getItem(LS_CONVS)) || []; }
  catch { return []; }
}

function saveConversations() {
  localStorage.setItem(LS_CONVS, JSON.stringify(conversations));
}

function loadActiveId() {
  return localStorage.getItem(LS_ACTIVE) || null;
}

function saveActiveId(id) {
  localStorage.setItem(LS_ACTIVE, id);
}

// In-memory state
let conversations = loadConversations();
let activeId      = loadActiveId();

/** Return the active conversation object, or null. */
function getActive() {
  return conversations.find(c => c.id === activeId) || null;
}

/**
 * Create a brand-new conversation, make it active, persist.
 * Returns the new conversation object.
 */
function createConversation() {
  const conv = {
    id:        uid(),
    title:     "New Conversation",
    createdAt: new Date().toISOString(),
    messages:  [],
  };
  conversations.unshift(conv);  // newest first
  activeId = conv.id;
  saveConversations();
  saveActiveId(activeId);
  return conv;
}

/**
 * Delete a conversation by id.
 * If it was active, switch to the next one (or create fresh).
 */
function deleteConversation(id) {
  conversations = conversations.filter(c => c.id !== id);
  saveConversations();
  if (activeId === id) {
    activeId = conversations.length ? conversations[0].id : null;
    saveActiveId(activeId || "");
    if (!activeId) createConversation();
  }
}

/**
 * Derive a title from the first user message (max 40 chars).
 */
function deriveTitle(text) {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 40 ? clean.slice(0, 38) + "…" : clean;
}

/* ──────────────────────────────────────────────────────────────
   6. THEME MANAGEMENT
────────────────────────────────────────────────────────────── */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(LS_THEME, theme);
  if (themeLabel) themeLabel.textContent = theme === "dark" ? "Light mode" : "Dark mode";
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme");
  applyTheme(cur === "dark" ? "light" : "dark");
}

applyTheme(localStorage.getItem(LS_THEME) || "dark");
themeToggle.addEventListener("click", toggleTheme);

/* ──────────────────────────────────────────────────────────────
   7. SIDEBAR RENDER
   Groups conversations into Today / Yesterday / Older.
────────────────────────────────────────────────────────────── */

/** Return "today" | "yesterday" | "older" bucket for a conversation. */
function dateBucket(isoString) {
  const d     = new Date(isoString);
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff  = (today - dDate) / 86_400_000;
  if (diff < 1)  return "Today";
  if (diff < 2)  return "Yesterday";
  return "Older";
}

function renderSidebar() {
  convList.innerHTML = "";

  if (conversations.length === 0) {
    const empty = document.createElement("p");
    empty.style.cssText = "font-size:.8rem;color:var(--text-muted);padding:16px 12px;";
    empty.textContent = "No conversations yet.";
    convList.appendChild(empty);
    return;
  }

  // Group by bucket
  const groups = {};
  conversations.forEach(conv => {
    const bucket = dateBucket(conv.createdAt);
    if (!groups[bucket]) groups[bucket] = [];
    groups[bucket].push(conv);
  });

  ["Today", "Yesterday", "Older"].forEach(bucket => {
    if (!groups[bucket]) return;

    // Section label
    const label = document.createElement("div");
    label.className = "conv-group-label";
    label.textContent = bucket;
    convList.appendChild(label);

    groups[bucket].forEach(conv => {
      const item = document.createElement("div");
      item.className = "conv-item" + (conv.id === activeId ? " active" : "");
      item.dataset.id = conv.id;
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.setAttribute("aria-label", conv.title);

      // Chat icon
      item.innerHTML = `
        <svg class="conv-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="conv-title">${escapeHtml(conv.title)}</span>
        <button class="conv-delete" data-id="${conv.id}"
                aria-label="Delete conversation" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6"  y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      `;

      // Click → switch conversation
      item.addEventListener("click", (e) => {
        if (e.target.closest(".conv-delete")) return;
        switchConversation(conv.id);
        closeSidebar();
      });

      // Keyboard activation
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          switchConversation(conv.id);
          closeSidebar();
        }
      });

      // Per-item delete button
      item.querySelector(".conv-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteConversation(conv.id);
        renderSidebar();
        renderMessages();
        updateHeaderTitle();
      });

      convList.appendChild(item);
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   8. CONVERSATION SWITCHING
────────────────────────────────────────────────────────────── */
function switchConversation(id) {
  activeId = id;
  saveActiveId(id);
  renderSidebar();
  renderMessages();
  updateHeaderTitle();
  messageInput.focus();
}

function updateHeaderTitle() {
  const conv = getActive();
  headerTitle.textContent = conv ? conv.title : "AI Chat Interface";
}

/* ──────────────────────────────────────────────────────────────
   9. MESSAGE RENDER HELPERS
────────────────────────────────────────────────────────────── */

/** Escape HTML special chars for safe text insertion. */
function escapeHtml(str) {
  return str
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" });
}

function formatDateLabel(date) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d     = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff  = (today - d) / 86_400_000;
  if (diff < 1) return "Today";
  if (diff < 2) return "Yesterday";
  return date.toLocaleDateString([], { weekday:"short", day:"numeric", month:"short" });
}

function dateKey(iso) { return iso.slice(0, 10); }

function insertDateDivider(label) {
  const el = document.createElement("div");
  el.className = "date-divider";
  el.textContent = label;
  chatMessages.appendChild(el);
}

/* Build the AI avatar SVG */
function aiAvatarHTML() {
  return `<div class="avatar avatar--ai" aria-label="AI">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  </div>`;
}

/* Build the User avatar */
function userAvatarHTML() {
  return `<div class="avatar avatar--user" aria-label="You">U</div>`;
}

/**
 * Render a single message into chatMessages.
 * @param {object} msg   — { role, text, timestamp }
 * @param {boolean} anim — whether to play the entry animation
 */
function renderMessage(msg, anim = true) {
  const date = new Date(msg.timestamp);
  const isAI = msg.role === "ai";

  const row = document.createElement("div");
  row.className = `message-row message-row--${msg.role}`;
  if (!anim) row.style.animation = "none";

  // Avatar
  const avatar = document.createElement("div");
  avatar.innerHTML = isAI ? aiAvatarHTML() : userAvatarHTML();

  // Message body
  const body = document.createElement("div");
  body.className = "msg-body";

  // Sender label
  const label = document.createElement("div");
  label.className = "msg-label";
  label.textContent = isAI ? "AI Assistant" : "You";

  // Bubble wrapper (holds bubble + copy button)
  const wrap = document.createElement("div");
  wrap.className = "bubble-wrap";

  // Bubble — render Markdown for AI, plain text for user
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (isAI) {
    // AI messages: render Markdown (safe — marked does not execute scripts)
    bubble.innerHTML = renderMarkdown(msg.text);
  } else {
    // User messages: plain text, escape HTML for XSS safety
    bubble.textContent = msg.text;
  }

  // Copy button
  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.title = "Copy message";
  copyBtn.setAttribute("aria-label", "Copy message text");
  copyBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>`;
  copyBtn.addEventListener("click", () => copyMessage(msg.text, copyBtn));

  wrap.appendChild(bubble);
  wrap.appendChild(copyBtn);

  // Timestamp
  const timeEl = document.createElement("div");
  timeEl.className = "msg-time";
  timeEl.textContent = formatTime(date);

  body.appendChild(label);
  body.appendChild(wrap);
  body.appendChild(timeEl);

  row.appendChild(avatar.firstElementChild);
  row.appendChild(body);
  chatMessages.appendChild(row);
}

/**
 * Copy message text to clipboard.
 * Shows a brief visual confirmation on the button.
 */
async function copyMessage(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    // Visual "Copied!" state
    const original = btn.innerHTML;
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>`;
    btn.classList.add("copied");
    setTimeout(() => {
      btn.innerHTML = original;
      btn.classList.remove("copied");
    }, 1800);
  } catch {
    // Clipboard API may be blocked; silently ignore
  }
}

/* ──────────────────────────────────────────────────────────────
   10. RENDER ALL MESSAGES FOR ACTIVE CONVERSATION
────────────────────────────────────────────────────────────── */
function renderMessages() {
  chatMessages.innerHTML = "";
  const conv = getActive();

  if (!conv || conv.messages.length === 0) {
    renderEmptyState();
    return;
  }

  let lastDateKey = null;
  conv.messages.forEach(msg => {
    const dKey = dateKey(msg.timestamp);
    if (dKey !== lastDateKey) {
      insertDateDivider(formatDateLabel(new Date(msg.timestamp)));
      lastDateKey = dKey;
    }
    renderMessage(msg, false); // no animation on history restore
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderEmptyState() {
  const div = document.createElement("div");
  div.className = "empty-state";
  div.id = "emptyState";
  div.innerHTML = `
    <div class="empty-state__icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    </div>
    <p class="empty-state__title">How can I help you today?</p>
    <p class="empty-state__sub">Type a message below. Your conversations are saved automatically.</p>
  `;
  chatMessages.appendChild(div);
}

function removeEmptyState() {
  document.getElementById("emptyState")?.remove();
}

/* ──────────────────────────────────────────────────────────────
   11. TYPING INDICATOR
────────────────────────────────────────────────────────────── */
function showTypingIndicator() {
  const row = document.createElement("div");
  row.className = "message-row message-row--ai";
  row.id = "typingRow";

  const avatarWrap = document.createElement("div");
  avatarWrap.innerHTML = aiAvatarHTML();

  const body = document.createElement("div");
  body.className = "msg-body";

  const label = document.createElement("div");
  label.className = "msg-label";
  label.textContent = "AI Assistant";

  const indicator = document.createElement("div");
  indicator.className = "typing-indicator";
  indicator.setAttribute("aria-label", "AI is typing");
  indicator.innerHTML = "<span></span><span></span><span></span>";

  body.appendChild(label);
  body.appendChild(indicator);

  row.appendChild(avatarWrap.firstElementChild);
  row.appendChild(body);
  chatMessages.appendChild(row);
  scrollToBottom();
  return row;
}

function hideTypingIndicator(row) {
  row?.remove();
}

/* ──────────────────────────────────────────────────────────────
   12. SCROLL
────────────────────────────────────────────────────────────── */
function scrollToBottom() {
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
}

chatMessages.addEventListener("scroll", () => {
  const dist = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
  scrollFab.classList.toggle("visible", dist > 120);
});

scrollFab.addEventListener("click", scrollToBottom);

/* ──────────────────────────────────────────────────────────────
   13. SEND MESSAGE FLOW
────────────────────────────────────────────────────────────── */
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  removeEmptyState();

  const conv = getActive();
  const todayKey  = dateKey(new Date().toISOString());
  const lastMsg   = conv.messages[conv.messages.length - 1];

  // Insert a date divider if this is the first message of a new day
  if (!lastMsg || dateKey(lastMsg.timestamp) !== todayKey) {
    insertDateDivider("Today");
  }

  // Auto-title the conversation from the first user message
  if (conv.messages.length === 0) {
    conv.title = deriveTitle(text);
    saveConversations();
    updateHeaderTitle();
    renderSidebar();
  }

  // Build + persist user message
  const userMsg = { role: "user", text, timestamp: new Date().toISOString() };
  conv.messages.push(userMsg);
  saveConversations();

  renderMessage(userMsg, true);

  // Reset input
  messageInput.value = "";
  messageInput.style.height = "auto";
  charCount.textContent = "0";
  updateSendButton();
  scrollToBottom();

  // AI "thinking" delay: 700 – 1700 ms
  const typingRow = showTypingIndicator();
  await sleep(700 + Math.random() * 1000);

  // AI reply
  const aiMsg = { role: "ai", text: pickAIResponse(), timestamp: new Date().toISOString() };
  conv.messages.push(aiMsg);
  saveConversations();

  hideTypingIndicator(typingRow);
  renderMessage(aiMsg, true);
  scrollToBottom();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ──────────────────────────────────────────────────────────────
   14. INPUT EVENTS
────────────────────────────────────────────────────────────── */
function updateSendButton() {
  sendBtn.disabled = messageInput.value.trim().length === 0;
}

function autoResize() {
  messageInput.style.height = "auto";
  messageInput.style.height = messageInput.scrollHeight + "px";
}

messageInput.addEventListener("input", () => {
  autoResize();
  updateSendButton();
  charCount.textContent = messageInput.value.length;
});

messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

/* ──────────────────────────────────────────────────────────────
   15. SIDEBAR ACTIONS
────────────────────────────────────────────────────────────── */

/** New chat button */
btnNewChat.addEventListener("click", () => {
  const conv = createConversation();
  renderSidebar();
  renderMessages();
  updateHeaderTitle();
  messageInput.focus();
  closeSidebar();
});

/** Delete current chat (header button) */
btnDeleteChat.addEventListener("click", () => {
  if (!activeId) return;
  if (!confirm("Delete this conversation?")) return;
  deleteConversation(activeId);
  renderSidebar();
  renderMessages();
  updateHeaderTitle();
});

/* ── Mobile sidebar toggle ── */
function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("active");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("active");
}

btnHamburger.addEventListener("click", () => {
  sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
});
sidebarOverlay.addEventListener("click", closeSidebar);

/* ──────────────────────────────────────────────────────────────
   16. BOOT
────────────────────────────────────────────────────────────── */
(function init() {
  // Ensure there's at least one conversation
  if (conversations.length === 0) {
    createConversation();
  } else if (!activeId || !conversations.find(c => c.id === activeId)) {
    // Active id stale — fall back to newest
    activeId = conversations[0].id;
    saveActiveId(activeId);
  }

  renderSidebar();
  renderMessages();
  updateHeaderTitle();
  messageInput.focus();
})();
