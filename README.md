<div align="center">

<img src="public/logo.png" alt="Veil Logo" width="120" height="120" />

# Veil

### Private Web Proxy Browser

**A feature-rich, privacy-first web proxy that lets you unblock websites and browse anonymously — built with Next.js 16.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-New_York-000000?logo=shadcnui&logoColor=white)](https://ui.shadcn.com)

[![GitHub stars](https://img.shields.io/github/stars/zelvior/veil?style=social)](https://github.com/zelvior/veil/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/zelvior/veil?style=social)](https://github.com/zelvior/veil/network/members)
[![GitHub issues](https://img.shields.io/github/issues/zelvior/veil)](https://github.com/zelvior/veil/issues)
[![GitHub PRs](https://img.shields.io/github/issues-pr/zelvior/veil)](https://github.com/zelvior/veil/pulls)

[🌐 Website](https://github.com/zelvior/veil) ·
[📚 Documentation](https://github.com/zelvior/veil#readme) ·
[💬 Discord](https://discord.gg/UQfzQzymc) ·
[▶️ YouTube](https://youtube.com/@zelviorhere) ·
[🔗 Linktree](https://linktr.ee/zelvior)

</div>

---

## 📖 Overview

**Veil** is a production-grade web proxy application that enables private, anonymous browsing through a sophisticated server-side proxy engine. Every request is fetched server-side, rewritten, and streamed back to the client — the destination site never sees your real IP address.

Built by **[Zelvior Labs](https://linktr.ee/zelvior)**, Veil combines a high-performance proxy engine with a full browser-grade UI featuring multi-tab browsing, bookmarks, history, command palette, and an integrated website unblocker.

### ✨ Key Highlights

- 🔒 **Privacy-First** — Your real IP is never exposed to target sites
- 🚀 **High-Performance Streaming** — Zero-buffer media streaming with HTTP Range support
- 🛡️ **Tracker & Ad Blocking** — 40+ tracker domains blocked at DOM and request level
- 🕵️ **WebRTC Leak Prevention** — RTCPeerConnection neutralized to prevent IP leaks
- 🔄 **Browser Profile Rotation** — 7 realistic browser profiles (Chrome, Firefox, Safari, Edge, mobile)
- 🍪 **Session Isolation** — Ephemeral per-session cookie jars prevent cross-site tracking

---

## 🚀 Features

### Core Proxy Engine
- **Unified proxy route** (`/api/proxy?url=`) handling GET, POST, PUT, PATCH, DELETE, and OPTIONS
- **Streaming binary assets** via `ReadableStream` — no buffering for large files/video/audio
- **HTTP Range header support** (`206 Partial Content`) for native HTML5 video seeking
- **HTML/CSS/JS rewriting** — all URLs rewritten to route through the proxy
- **Cookie & session management** — per-session cookie jars with redirect-aware capture
- **TLS/SSL fallback** — graceful handling of self-signed certificate errors

### Security & Anti-Blocking
- **Header spoofing & rotation** — realistic `User-Agent`, `Sec-Ch-Ua`, `Accept-Language` headers
- **CSP/CORS/COOP stripping** — removes all restrictive framing headers
- **IP anonymization** — strips 21 client-identifying headers (`X-Forwarded-For`, `X-Real-IP`, `Via`, etc.)
- **Tracker blocking** — 40+ ad/analytics domains blocked (Google Analytics, DoubleClick, Facebook Pixel, etc.)
- **Inline script stripping** — pattern-matches and removes analytics snippets (`gtag`, `fbq`, `dataLayer.push`)

### Client-Side Interceptor
- **`window.fetch` override** — dynamic API calls auto-routed through proxy
- **`XMLHttpRequest.open` override** — XHR calls auto-routed
- **`WebSocket` constructor patch** — WS connections routed through proxy
- **`Worker` / `SharedWorker` patch** — worker scripts proxied
- **`RTCPeerConnection` blocked** — WebRTC IP leak prevention (Tor/Brave approach)
- **`HTMLFormElement.submit` patch** — JS-initiated form submits intercepted
- **`location.href` / `assign` / `replace` patch** — SPA navigations caught
- **`MutationObserver`** — dynamically inserted DOM nodes auto-rewritten

### Browser UI
- 🗂️ **Multi-tab browsing** with per-tab back/forward history
- 🕵️ **Incognito mode** — tabs that never record history
- ⭐ **Bookmarks & quick links** — customizable shortcuts
- 📜 **Searchable history** — grouped by day (Today/Yesterday/weekday)
- ⌨️ **Command palette** (Ctrl+K) — fuzzy search across actions, history, bookmarks
- 🎨 **Light / Dark / System theme**
- ⚙️ **Settings dialog** — search engine, browser profile, privacy controls
- 📱 **Fully responsive** — mobile-first design

### Unblocker
- 🌐 **6 categories** of commonly blocked sites (Search, Social, News, Reference, Media, Tech)
- 🔓 **34 popular sites** pre-configured for one-click unblocking
- 🖥️ **7 browser profiles** — Chrome/Firefox/Safari/Edge on desktop and mobile

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| **Database** | [Prisma ORM](https://www.prisma.io) (SQLite) |
| **HTML Parsing** | [Cheerio](https://cheerio.js.org) |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) |
| **Icons** | [Lucide React](https://lucide.dev) |
| **Runtime** | [Bun](https://bun.sh) |

---

## 📦 Installation

### Prerequisites

- **Node.js 18+** or **Bun 1.0+**
- **npm**, **pnpm**, **yarn**, or **bun**

### Quick Start

```bash
# Clone the repository
git clone https://github.com/zelvior/veil.git
cd veil

# Install dependencies
bun install
# or: npm install

# Set up the database
bun run db:push
# or: npx prisma db push

# Start the development server
bun run dev
# or: npm run dev
```

The app will be available at `http://localhost:3000`.

### Build for Production

```bash
bun run build
bun run start
```

### Self-Hosted (Standalone/Docker)

```bash
bun run build:standalone
bun run start:standalone
```

### Environment Variables

Create a `.env` file in the project root (see `.env.example`):

```env
# Local development (SQLite — default)
DATABASE_URL="file:./db/custom.db"

# Production (PostgreSQL — Vercel Postgres, Supabase, Neon, etc.)
# DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
```

> **Note:** If `DATABASE_URL` is not set or the database is unreachable, Veil
> automatically falls back to an in-memory store. The proxy still works, but
> history/bookmarks/settings won't persist across restarts.

### Deploying to Vercel

1. **Fork** the repository on GitHub
2. **Import** it into [Vercel](https://vercel.com/new)
3. **Set the `DATABASE_URL` environment variable** (optional — app works without it via in-memory fallback)
4. **Deploy** — Vercel automatically runs `postinstall` (which runs `prisma generate`) then `next build`

**Using PostgreSQL on Vercel (recommended for persistence):**

1. Create a PostgreSQL database (Vercel Postgres, Supabase, or Neon)
2. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Set `DATABASE_URL` in Vercel project settings
4. Run `bun run db:push` locally to create the tables
5. Deploy

---

## 🎯 Usage

1. **Open the app** — you'll see the Unblocker home page with a search bar and category shortcuts
2. **Enter a URL** — type any website address (e.g., `wikipedia.org`) and press Enter or click **Unblock**
3. **Browse privately** — the site loads inside the proxy iframe; your IP is hidden
4. **Use tabs** — press `Ctrl+T` for a new tab, `Ctrl+Shift+T` for an incognito tab
5. **Command palette** — press `Ctrl+K` to search history, bookmarks, or run commands
6. **Switch profiles** — open Settings → General → Browser Profile to change your User-Agent
7. **Bookmark pages** — click the star icon in the address bar

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | New tab |
| `Ctrl+Shift+T` | New incognito tab |
| `Ctrl+K` | Command palette |
| `Ctrl+R` | Reload page |
| `Ctrl+B` | Toggle bookmarks sidebar |
| `Ctrl+H` | Toggle history sidebar |
| `Alt+←` | Go back |
| `Alt+→` | Go forward |
| `Esc` | Close palette/dialog |

---

## 📁 Project Structure

```
veil/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── proxy/
│   │   │   │   ├── route.ts          # Unified proxy route (streaming + Range)
│   │   │   │   └── clear/route.ts    # Clear cookies endpoint
│   │   │   ├── session/route.ts      # Ephemeral session management
│   │   │   ├── history/route.ts      # Browsing history CRUD
│   │   │   ├── bookmarks/route.ts    # Bookmarks CRUD
│   │   │   ├── settings/route.ts     # Settings persistence
│   │   │   └── quicklinks/route.ts   # Quick links CRUD
│   │   ├── layout.tsx                # Root layout + metadata
│   │   ├── page.tsx                  # Main page (browser shell)
│   │   └── globals.css               # Global styles
│   ├── components/
│   │   ├── proxy/
│   │   │   ├── browser-shell.tsx     # Main browser layout
│   │   │   ├── tab-bar.tsx           # Multi-tab bar
│   │   │   ├── navigation-bar.tsx    # Address bar + nav controls
│   │   │   ├── bookmarks-bar.tsx     # Bookmarks strip
│   │   │   ├── proxy-view.tsx        # Iframe proxy renderer
│   │   │   ├── new-tab-page.tsx      # Unblocker home page
│   │   │   ├── sidebar.tsx           # History/bookmarks sidebar
│   │   │   ├── command-palette.tsx   # Ctrl+K palette
│   │   │   └── settings-dialog.tsx   # Settings dialog
│   │   ├── ui/                       # shadcn/ui components
│   │   └── icons.tsx                 # Custom + brand icons
│   ├── lib/
│   │   ├── proxy.ts                  # URL encoding, CSS rewriting (client-safe)
│   │   ├── proxy-engine.ts           # HTML/JS rewriting, interceptor injection
│   │   ├── cookie-jar.ts             # Global cookie management
│   │   ├── session-store.ts          # Ephemeral session isolation
│   │   ├── security-utils.ts         # Header sanitization, TLS fallback, tracker list
│   │   ├── tracker-blocker.ts        # DOM-level tracker filtering
│   │   ├── browser-profiles.ts       # 7 browser UA profiles + unblock categories
│   │   └── db.ts                     # Prisma client
│   └── store/
│       └── proxy-store.ts            # Zustand state management
├── prisma/
│   └── schema.prisma                 # Database schema
├── public/                           # Static assets
├── LICENSE                           # Apache 2.0
├── README.md                         # This file
└── package.json
```

---

## 🔐 Security Architecture

### Request Flow

```
User Browser
    │
    ▼
Next.js Route (/api/proxy?url=...)
    │
    ├─ 1. Anonymize incoming headers (strip IP/geo)
    ├─ 2. Check tracker blocklist → block if match
    ├─ 3. Get/create ephemeral session
    ├─ 4. Build secure upstream headers (rotated UA, Sec-Ch-Ua)
    ├─ 5. Fetch upstream (with TLS fallback + cookie forwarding)
    ├─ 6. Strip CSP/X-Frame-Options/COOP from response
    ├─ 7. Rewrite HTML/CSS/JS URLs → /api/proxy?url=
    ├─ 8. Strip tracker scripts from HTML
    ├─ 9. Inject client-side interceptor into <head>
    └─ 10. Stream response to client (ReadableStream)
```

### Privacy Layers

| Layer | Protection |
|-------|-----------|
| **Network** | Server-side fetch — target site sees server IP, not user IP |
| **Headers** | 21 client-identifying headers stripped before forwarding |
| **Cookies** | Per-session isolation — no cross-user tracking |
| **Trackers** | 40+ domains blocked at DOM + request level |
| **WebRTC** | RTCPeerConnection blocked — no IP leak via ICE candidates |
| **WebSocket** | WS connections routed through proxy |
| **Fingerprinting** | Rotated Accept-Language, selectable browser profiles |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure to run `bun run lint` before submitting.

---

## 📜 License

Copyright 2024 **Zelvior Labs**

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

See the [LICENSE](LICENSE) file for the full license text.

---

## 👤 Author & Credits

### Creator

<div align="center">

**Zelvior**

[![GitHub](https://img.shields.io/badge/GitHub-zelvior-181717?logo=github&logoColor=white)](https://github.com/zelvior)
[![ORCID](https://img.shields.io/badge/ORCID-0009--0009--2376--367X-a6ce39?logo=orcid&logoColor=white)](https://orcid.org/0009-0009-2376-367X)
[![Email](https://img.shields.io/badge/Email-zelvior@proton.me-d14836?logo=protonmail&logoColor=white)](mailto:zelvior@proton.me)
[![NPM](https://img.shields.io/badge/NPM-~zelnpm-cb3837?logo=npm&logoColor=white)](https://www.npmjs.com/~zelnpm)

[![YouTube](https://img.shields.io/badge/YouTube-@zelviorhere-FF0000?logo=youtube&logoColor=white)](https://youtube.com/@zelviorhere)
[![Linktree](https://img.shields.io/badge/Linktree-zelvior-39E09B?logo=linktree&logoColor=white)](https://linktr.ee/zelvior)
[![Discord](https://img.shields.io/badge/Discord-Community-5865F2?logo=discord&logoColor=white)](https://discord.gg/UQfzQzymc)

</div>

### Organization

**Zelvior Labs** — Privacy-focused web tools and security research.

### Acknowledgments

- [Next.js](https://nextjs.org) — The React framework for the web
- [shadcn/ui](https://ui.shadcn.com) — Beautifully designed components
- [Cheerio](https://cheerio.js.org) — Fast, flexible & lean implementation of core jQuery
- [Prisma](https://www.prisma.io) — Next-generation ORM for Node.js and TypeScript
- [Lucide](https://lucide.dev) — Beautiful & consistent icon toolkit

---

## 🌟 Support

If you find Veil useful, please consider:

- ⭐ Starring the [GitHub repository](https://github.com/zelvior/veil)
- 🐛 Reporting bugs via [GitHub Issues](https://github.com/zelvior/veil/issues)
- 💬 Joining our [Discord community](https://discord.gg/UQfzQzymc)
- ▶️ Subscribing to [YouTube](https://youtube.com/@zelviorhere)
- 🔗 Following on [Linktree](https://linktr.ee/zelvior)

---

## 📄 Legal & Information

Veil includes comprehensive legal documentation. All pages are accessible in-app via the footer "Legal" link or directly at:

| Page | URL | Description |
|------|-----|-------------|
| **About** | `/legal/about` | Project mission, features, tech stack |
| **Privacy Policy** | `/legal/privacy` | Data handling, no-logging commitment |
| **Terms of Service** | `/legal/terms` | Usage terms and conditions |
| **Cookie Policy** | `/legal/cookies` | How cookies work in the proxy |
| **DMCA Policy** | `/legal/dmca` | Copyright takedown procedure |
| **Disclaimer** | `/legal/disclaimer` | Limitations and warnings |
| **Contact** | `/legal/contact` | All contact channels |

The legal index page at [`/legal`](/legal) provides a clean card-based overview of all documentation.

---

<div align="center">

**Veil** · Built with ❤️ by **[Zelvior Labs](https://linktr.ee/zelvior)**

Licensed under **[Apache 2.0](LICENSE)**

© 2024 Zelvior Labs. All rights reserved.

</div>
