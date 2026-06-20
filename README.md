# CodeSync — Real-Time Collaborative Development Platform

A collaborative development environment built with React, Monaco Editor, Yjs CRDTs, and WebRTC. Features real-time multi-user editing, AI-powered code analysis, a collaborative terminal, version history with diff visualization, and multi-file workspace management.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Editor | Monaco Editor + y-monaco |
| Real-Time Sync | Yjs CRDTs + y-webrtc (WebRTC P2P) |
| Auth & DB | Supabase (Google + GitHub OAuth) |
| AI | Google Gemini API (streaming) |
| Code Execution | Piston API (free, no key) |
| Routing | React Router v6 |

---

## Quick Start (No Auth)

The app works immediately without any configuration — real-time collaboration works peer-to-peer via WebRTC.

```bash
cd app
npm install
npm run dev
```

Open `http://localhost:5173`, create a room, and share the URL.

---

## Full Setup (Auth + Persistence + AI)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project (free tier)
2. Go to **SQL Editor** → paste and run `supabase/schema.sql`
3. Go to **Project Settings → API** → copy `Project URL` and `anon public` key

### 2. Enable Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com) → New Project
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret
5. In Supabase dashboard → **Authentication → Providers → Google** → paste credentials

### 3. Enable GitHub OAuth (optional)

1. GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App
2. Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`
3. In Supabase → **Authentication → Providers → GitHub** → paste credentials

### 4. Get Gemini API Key

1. Go to [aistudio.google.com](https://aistudio.google.com/app/apikey)
2. Create API key (free tier is sufficient)

### 5. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
# VITE_GEMINI_KEY=your-gemini-key
```

### 6. Run

```bash
npm run dev
```

---

## Features

### Collaboration (Phase 1)
- **Room system**: Generate unique 8-char room IDs (`nanoid`), shareable invite links
- **WebRTC P2P sync**: Yjs CRDTs over WebRTC — works without a server
- **Live cursors**: Remote user cursors and selections rendered in Monaco via `deltaDecorations`
- **Presence metrics**: Active users count, total edit count, peer latency estimate

### Auth & Permissions (Phase 2)
- **Google / GitHub OAuth**: via Supabase Auth — zero backend required
- **Roles**: `owner`, `editor`, `viewer` — viewers get read-only Monaco
- **Protected routes**: Dashboard and editor require auth (graceful bypass in dev mode)

### Multi-File IDE (Phase 3)
- **File explorer**: Add, rename, delete files with inline editing
- **Tab bar**: Open multiple files, each with its own Y.Text CRDT binding
- **Language detection**: 20+ file extensions → Monaco language ID + Piston language ID

### Version History (Phase 4)
- **Snapshots**: Save any file state to Supabase (localStorage fallback)
- **Diff visualization**: Pure-JS LCS diff algorithm — no library — shows `+/-` lines
- **Restore**: Y.Doc transaction restores state and syncs to all peers instantly

### AI Features (Phase 5)
- **Explain**: Plain-English explanation of selected code
- **Bug Detect**: Potential issues with line references and severity
- **Code Review**: Structured review (correctness, readability, performance, edge cases)
- **Complexity**: Big-O time/space analysis per function
- **Architecture Analysis**: Dependency graph, complexity hotspots, refactoring suggestions across all workspace files

### Collaborative Terminal (Phase 6)
- **Piston API**: Free code execution (no key needed) — Python, JS, Java, C++, Go, Rust, and more
- **Shared Y.Array**: Terminal output synced across all peers in real time via Yjs
- **Attribution**: Shows which user triggered each run session

### UI/UX (Phase 7)
- **Dark/light mode**: CSS custom properties, smooth transitions, persisted to localStorage
- **Professional IDE layout**: File explorer + editor + right panel (AI/History) + bottom terminal
- **Responsive**: Works on various screen sizes

---

## Architecture Notes

### Why Yjs + WebRTC?

Yjs implements CRDTs (Conflict-free Replicated Data Types). Every edit is a commutative, associative operation — no edit conflicts, no locks, no server-side merge logic. WebRTC provides the P2P transport. This demonstrates distributed state management and real-time concurrency at the protocol level.

### Why Supabase over a custom backend?

For a collaborative tool, the realtime sync (the hard part) is already handled by Yjs. Supabase handles auth, metadata storage, and RLS-protected persistence. This lets the project focus on the distributed systems layer rather than building a CRUD backend.

### The Diff Algorithm

`DiffViewer.tsx` implements Longest Common Subsequence (LCS) from scratch — O(mn) DP with traceback. No external library. This demonstrates understanding of classic algorithms in a practical context.

### Collaborative Terminal

The terminal isn't a real shared shell session (that would require a WebSocket server). Instead, it's a `Y.Array<TerminalLine>` in the shared Y.Doc. When any user runs code, the output lines are appended to this array. All peers observe the array and render it. Technically honest and genuinely impressive.

---

## Project Structure

```
src/
├── lib/           # Supabase client, Yjs factory, Piston API, awareness helpers
├── hooks/         # usePresence, useFiles, useVersions, useRunner, useAI, useRoom
├── features/
│   ├── auth/      # AuthContext, ProtectedRoute
│   ├── rooms/     # roomUtils, RoomPermissions
│   ├── editor/    # MonacoWrapper, EditorTabs, cursorDecorations, languageMap
│   ├── files/     # FileExplorer
│   ├── versions/  # VersionPanel, DiffViewer (LCS)
│   ├── ai/        # AIPanel (Gemini streaming)
│   └── runner/    # RunPanel (Piston + Y.Array terminal)
├── components/
│   ├── layout/    # Topbar, AppShell
│   └── presence/  # CollaboratorAvatars, PresenceMetrics
└── pages/         # Landing, LoginPage, Dashboard, EditorPage, NotFound
```
