# CodeSync — Real-Time Collaborative Web Code Editor

CodeSync is a production-oriented, real-time multiplayer web code editor that brings together the power of **VS Code (Monaco Editor)**, the conflict-free concurrent editing of **Google Docs (CRDT via Yjs)**, and a sandboxed browser runtime with live console streaming.

---

## 🌟 Key Features

1. **Conflict-Free Real-Time Collaboration (CRDT)**:
   - Built on **Yjs** and **`y-monaco`** over dedicated WebSockets.
   - Awareness protocol synchronizes remote cursors, selections, and user tags with distinct colors.
   - Deterministic CRDT convergence prevents merge conflicts and data loss during concurrent keystrokes.
2. **Professional Monaco Editor Core**:
   - The same engine that powers VS Code.
   - Syntax highlighting for HTML, CSS, JavaScript, JSON.
   - Custom `codesync-dark` developer theme, multi-file tabs, auto-indentation, bracket colorization, and status bar.
3. **Isolated Sandboxed Live Preview**:
   - Sandboxed `<iframe>` (`sandbox="allow-scripts allow-modals"`).
   - **`allow-same-origin` is omitted**, ensuring user code cannot touch authentication cookies, session storage, or DOM.
   - Dynamic resolver inlines relative stylesheets (`<link rel="stylesheet">`) and scripts (`<script src="...">`).
4. **Live Browser Console Streaming**:
   - Defensive preamble injected into preview `<head>` captures `console.log`, `warn`, `error`, `info`, and uncaught JavaScript runtime exceptions.
   - Streams formatted messages via validated `postMessage` bridge to the parent Console panel.
5. **Hierarchical Cloud File System**:
   - Real folder trees and nested files stored in MongoDB.
   - Starter template includes interactive counter with DOM manipulation and CSS styling.
   - File system mutations (create, rename, delete) synchronize across active collaborators in real-time.
6. **Granular Role-Based Access Control (RBAC)**:
   - **Owner**: Full control (rename, delete, invite, manage roles).
   - **Editor**: Can create, edit, rename, delete files and send chat messages.
   - **Viewer**: Read-only access enforced at Monaco, REST API, and binary CRDT protocol levels.
7. **Workspace Team Chat & Presence**:
   - Socket.IO chat channel with persistent message history, timestamps, and sender avatar colors.
   - Live presence indicator showing active online collaborators.
8. **Durable Database Persistence**:
   - Debounced autosave (1000ms idle flush) writes binary Yjs CRDT snapshots to `CollaborativeDocument` and text mirrors to `WorkspaceFile`.
   - Complete resilience against server restarts with zero data loss.

---

## 🏗️ Architecture

```
                               ┌─────────────────────────────────────────────────────────┐
                               │                    CodeSync Frontend                    │
                               │               (React + Vite + Tailwind)                 │
                               └──────────┬───────────────────────────────┬──────────────┘
                                          │ REST API                      │ WebSockets (Socket.IO + Yjs)
                                          ▼                               ▼
                               ┌─────────────────────────────────────────────────────────┐
                               │                     Express Server                      │
                               │   - REST API (Auth, Workspaces, Files, Members, Chat)   │
                               │   - Socket.IO Gateway (Presence, Chat, File CRUD sync)  │
                               │   - Yjs CRDT Sync Server (Awareness, Remote Cursors)    │
                               │   - Debounced Persistence Engine                        │
                               └──────────────────────────┬──────────────────────────────┘
                                                          ▼
                               ┌─────────────────────────────────────────────────────────┐
                               │                     MongoDB Database                    │
                               │  - Users, Workspaces, WorkspaceMembers, WorkspaceFiles  │
                               │  - CollaborativeDocuments (Yjs Binaries), Messages      │
                               │  - Invitations (Secure Tokens, Expiry)                  │
                               └─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js**: v18+ (tested on Node.js v24 LTS)
- **npm**: v9+
- **MongoDB**: Local MongoDB instance running on `127.0.0.1:27017` or a MongoDB Atlas connection URI

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/codesync.git
cd codesync

# Install root, client, and server dependencies
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/codesync
JWT_SECRET=your-secure-jwt-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
```

### 3. Start Development Servers
You can start both backend and frontend concurrently:
```bash
npm run dev
```
Or start them individually:
```bash
# Start backend server (port 5000)
npm run dev:server

# In a separate terminal, start frontend client (port 5173)
npm run dev:client
```

Open your browser at `http://localhost:5173`.

---

## 🧪 Comprehensive Verification Scenarios (20/20 Passed)

The test suite in `server/test/test-comprehensive-verification.js` validates all 20 required production scenarios:

| # | Scenario | Status |
|---|---|:---:|
| 1 | User registration and login credential verification | ✅ PASS |
| 2 | Protected routes & user safe objects omit password hash | ✅ PASS |
| 3 | Create and reopen workspaces | ✅ PASS |
| 4 | Files and starter templates persist in MongoDB | ✅ PASS |
| 5 | Two distinct users join same workspace via invitation | ✅ PASS |
| 6 | Editing same file updates both clients in real time | ✅ PASS |
| 7 | Simultaneous typing does not lose edits (CRDT convergence) | ✅ PASS |
| 8 | Remote cursors and user awareness configuration | ✅ PASS |
| 9 | Chat message delivered and persisted in history | ✅ PASS |
| 10 | Disconnecting and reconnecting preserves state exactly | ✅ PASS |
| 11 | Server can restart without losing collaborative documents | ✅ PASS |
| 12 | HTML, CSS, and JS preview bundles relative workspace files | ✅ PASS |
| 13 | Console interceptor formats and routes postMessage logs | ✅ PASS |
| 14 | Viewer accounts restricted to read-only access | ✅ PASS |
| 15 | Unauthorized users rejected from accessing private workspace | ✅ PASS |
| 16 | Renaming and deleting files synchronizes in database | ✅ PASS |
| 17 | Frontend production build passes Vite bundler with zero errors | ✅ PASS |
| 18 | Backend starts and connects to MongoDB and WebSockets cleanly | ✅ PASS |
| 19 | Zero critical console errors or unhandled promise rejections | ✅ PASS |
| 20 | Zero authentication or database secrets exposed to frontend | ✅ PASS |

To execute the test suite:
```bash
cd server
node test/test-comprehensive-verification.js
```

---

## 🌐 Production Deployment Guide

### Frontend (Vercel)
1. Import repository on [Vercel](https://vercel.com).
2. Set Root Directory to `client`.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Environment Variable:
   - `VITE_API_URL`: URL of your deployed Node backend (e.g. `https://codesync-api.onrender.com`).
6. The included `client/vercel.json` ensures client-side routing works for `/dashboard`, `/workspace/:id`, and `/join/:token`.

### Backend (Render / Railway / Fly.io)
> ⚠️ **Important Hosting Note**: Serverless platforms (e.g., Vercel Functions, AWS Lambda) do **not** support persistent WebSockets or long-lived in-memory Yjs CRDT state. Use a persistent container service such as **Render**, **Railway**, or **Fly.io**.

1. Connect repository on Railway or Render.
2. Root directory: `server`.
3. Build command: `npm install`.
4. Start command: `node src/server.js`.
5. Set environment variables:
   - `PORT`: `5000` (or injected by platform)
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: Your MongoDB Atlas connection URI (`mongodb+srv://...`)
   - `JWT_SECRET`: High-entropy 64-character random string
   - `CLIENT_ORIGIN`: URL of your frontend (e.g. `https://codesync.vercel.app`)

### Database (MongoDB Atlas)
1. Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user with read/write permissions.
3. In Network Access, add IP access (`0.0.0.0/0` or your backend host IP).
4. Copy the connection string and paste into `MONGODB_URI`.

---

## 🛡️ Security Architecture

- **HTTP-Only Cookies**: Authentication tokens are stored in `codesync_token` cookies with `httpOnly: true`, `sameSite: lax/none`, and `secure: true` in production to prevent XSS credential theft.
- **Preview Isolation**: Preview iframe omits `allow-same-origin`, preventing untrusted JavaScript from reading parent cookies or manipulating DOM.
- **Path Traversal Protection**: File and folder names are validated against regex `/[/\\:*?"<>|\x00]/` and `..` traversal sequences.
- **WebSocket Room Authorization**: Sockets are verified against MongoDB membership before joining workspace rooms.

---

## 📄 License
MIT © CodeSync
