# AI Chat Interface
<p>
A fully client-side, ChatGPT-style chat application built with pure HTML, CSS, and JavaScript — no frameworks, no build tools, no backend required. </p>
<br>

demo- [visit website](https://shivani-vishwakarmaa.github.io/AI-chat-interface-/)
---

## Table of Contents

- [Demo](#demo)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [How It Works](#how-it-works)
  - [Multi-Conversation Sidebar](#multi-conversation-sidebar)
  - [Message History & Persistence](#message-history--persistence)
  - [Markdown Rendering](#markdown-rendering)
  - [Typing Animation](#typing-animation)
  - [Dark / Light Mode](#dark--light-mode)
  - [Copy Message](#copy-message)
  - [Avatars & Bubble Animation](#avatars--bubble-animation)
- [Connecting a Real AI API](#connecting-a-real-ai-api)
- [Customisation](#customisation)
- [Browser Support](#browser-support)
- [License](#license)

---

## Demo

Open `index.html` directly in any modern browser — no server needed.

```bash
# Clone or download the project, then simply open:
open index.html
```

Or serve it locally for a better development experience:

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .
```

Then visit `http://localhost:8080`.

---

## Features

| Feature | Details |
|---|---|
| **Multi-conversation sidebar** | Create, switch between, and delete multiple chat threads |
| **Message persistence** | All conversations survive page refreshes via `localStorage` |
| **Markdown rendering** | AI responses support headings, bold, code blocks, tables, blockquotes, and more |
| **Typing animation** | Animated three-dot indicator while the AI "thinks" |
| **Dark / Light mode** | One-click theme toggle, preference saved across sessions |
| **Copy message button** | Hover any bubble to reveal a clipboard copy button with visual feedback |
| **Avatars** | Distinct icons for the user and AI on every message |
| **Smooth animations** | Spring-eased bubble entrances, avatar pop-in, hover lift effects |
| **Auto-scroll & FAB** | Always jumps to the latest message; a floating button appears when scrolled up |
| **Auto-expanding input** | Textarea grows as you type, up to a capped height |
| **Keyboard shortcut** | `Enter` sends, `Shift+Enter` inserts a newline |
| **Mobile responsive** | Sidebar collapses to a slide-over drawer on small screens |
| **Zero dependencies** | Only one CDN script (marked.js for Markdown parsing) |

---

## Project Structure

```
ai-chat-interface/
├── index.html   — App shell: sidebar, header, message area, input bar
├── style.css    — All styles: CSS variables, themes, layout, components
├── script.js    — All logic: state, rendering, persistence, events
└── README.md    — This file
```

The three source files are deliberately kept separate and flat — no bundler, no preprocessor. Every important section is commented for easy navigation.

---

## Getting Started

1. **Download** or clone the repository.
2. Open `index.html` in a browser (Chrome, Firefox, Safari, or Edge).
3. Type a message and press **Enter** (or click the send button).

That's it. No `npm install`, no environment variables, no build step.

---

## How It Works

### Multi-Conversation Sidebar

Conversations are stored as a JSON array in `localStorage` under the key `aic_conversations`. Each conversation object looks like this:

```json
{
  "id": "lf3k2abc9",
  "title": "Explain bubble sort",
  "createdAt": "2025-03-14T10:22:00.000Z",
  "messages": [
    { "role": "user", "text": "Explain bubble sort", "timestamp": "..." },
    { "role": "ai",   "text": "Sure! Bubble sort works by...", "timestamp": "..." }
  ]
}
```

- **New chat** — `createConversation()` prepends a fresh object and makes it active.
- **Switch** — `switchConversation(id)` updates `activeId` in `localStorage`, re-renders the message area, and highlights the correct sidebar item.
- **Auto-title** — The conversation title is derived from the first user message (capped at 40 characters) the moment it is sent.
- **Grouping** — The sidebar groups conversations into *Today*, *Yesterday*, and *Older* buckets based on `createdAt`.

### Message History & Persistence

Every time a message is sent or received, the in-memory `conversations` array is serialised to `localStorage` with `JSON.stringify`. On page load, `loadConversations()` reads it back and `renderMessages()` replays the entire thread without the entry animation (so history restoration feels instant, not theatrical).

Clearing `localStorage` (or opening a private/incognito window) starts a completely fresh session.

### Markdown Rendering

AI messages are passed through **[marked.js](https://marked.js.org/)** — a lightweight, zero-dependency Markdown parser loaded from a CDN:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"></script>
```

```js
bubble.innerHTML = marked.parse(text, { gfm: true, breaks: true });
```

Supported elements include:

- Headings (`#`, `##`, `###`)
- **Bold**, *italic*, ~~strikethrough~~
- Inline `code` and fenced ` ```code blocks` `
- Ordered and unordered lists
- Blockquotes
- Tables
- Horizontal rules
- Links

User messages are inserted as plain text via `textContent` (never `innerHTML`) to prevent XSS injection.

### Typing Animation

When the user sends a message, three things happen in sequence:

1. `showTypingIndicator()` appends a special row with three `<span>` elements.
2. Each span is styled as a small circle and animated with `@keyframes dotBounce` — a vertical translate with staggered `animation-delay` values (0 ms, 160 ms, 320 ms), creating a rolling wave effect.
3. A `sleep()` Promise waits 700 – 1700 ms (randomised to feel natural), then `hideTypingIndicator()` removes the row and the real AI message is rendered with the standard entry animation.

```css
@keyframes dotBounce {
  0%, 60%, 100% { transform: translateY(0);    opacity: .4; }
  30%           { transform: translateY(-6px); opacity: 1;  }
}
```

### Dark / Light Mode

The entire colour system is defined as CSS custom properties on the `[data-theme]` attribute selector:

```css
[data-theme="dark"]  { --bg-app: #0d0e12; --accent: #4f6ef7; /* ... */ }
[data-theme="light"] { --bg-app: #f0f0f5; --accent: #4f6ef7; /* ... */ }
```

Switching themes is a single DOM write:

```js
document.documentElement.setAttribute("data-theme", "light");
```

Because every colour property in the stylesheet is declared with `transition: .22s`, the entire UI cross-fades automatically — no JavaScript animation required. The chosen theme is saved to `localStorage` under `aic_theme` and restored on every page load.

### Copy Message

Every message bubble is wrapped in a `.bubble-wrap` div that also contains a `.copy-btn`. The button is hidden by default (`opacity: 0`) and fades in when the wrapper is hovered (`opacity: 1`), keeping the UI clean:

```css
.bubble-wrap:hover .copy-btn { opacity: 1; transform: scale(1); }
```

Clicking it calls `navigator.clipboard.writeText(rawText)`. On success, the clipboard icon swaps to a checkmark for 1.8 seconds, then reverts. The raw Markdown source (not the rendered HTML) is copied, so pasting into another chat or editor preserves the formatting intent.

### Avatars & Bubble Animation

**Avatars** are 32 × 32 px circles positioned at the outer edge of each message row:

- **AI** — `var(--bg-avatar-ai)` background with a sparkle/star SVG icon in the accent colour.
- **User** — `var(--bg-avatar-user)` (accent blue) with the letter "U".

Both animate in with `@keyframes avatarPop` (scale from 70 % → 100 % with opacity), timed slightly after the bubble itself for a staggered effect.

**Bubble animation** uses a spring easing curve:

```css
@keyframes msgIn {
  from { opacity: 0; transform: translateY(14px) scale(.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);   }
}
.message-row { animation: msgIn .38s cubic-bezier(.22,1,.36,1) both; }
```

Bubbles also lift slightly on hover (`translateY(-1px)` + enhanced `box-shadow`) for a tactile feel.

---

## Connecting a Real AI API

The simulated responses in `script.js` are intentionally isolated in one function — `pickAIResponse()`. To wire up a real model (e.g. the Anthropic or OpenAI API), replace that function and the call inside `sendMessage()`:

```js
// Replace this in sendMessage():
const aiMsg = {
  role: "ai",
  text: await fetchAIReply(conv.messages),  // ← your API call
  timestamp: new Date().toISOString(),
};

// Implement fetchAIReply:
async function fetchAIReply(messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "YOUR_API_KEY",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: messages.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text })),
    }),
  });
  const data = await res.json();
  return data.content[0].text;
}
```

> **Note:** Never expose API keys in client-side code for a production app. Route requests through a backend proxy instead.

---

## Customisation

All design tokens live at the top of `style.css` as CSS variables. The most useful ones to tweak:

| Variable | Default (dark) | Purpose |
|---|---|---|
| `--accent` | `#4f6ef7` | Primary colour (buttons, links, active states) |
| `--bg-bubble-user` | `#4f6ef7` | User bubble background |
| `--sidebar-w` | `260px` | Sidebar width |
| `--r-bubble` | `18px` | Bubble corner radius |
| `--font-display` | `'Syne'` | Header / label font |
| `--font-body` | `'DM Sans'` | All body / UI text |

To swap fonts, update the Google Fonts `<link>` in `index.html` and the two `--font-*` variables in `:root`.

---

## Browser Support

| Browser | Minimum version |
|---|---|
| Chrome / Edge | 105+ |
| Firefox | 110+ |
| Safari | 16+ |

Requires: CSS custom properties, `dvh` units, `navigator.clipboard`, `localStorage`, and ES2020 (`async/await`, optional chaining).

---

## License

MIT — free to use, modify, and distribute.
