# Cortes LGU Portal — Backend

A small Express + SQLite backend that replaces the old localStorage-only
setup. The public site and the Admin Console now share the same data
through a real API, and the Admin Console requires a login.

## What changed

- **`server.js`** (new) — Express API + SQLite database, using Node's
  **built-in** `node:sqlite` module. This needs **no native compilation**
  (no Python, no Visual Studio Build Tools, no `node-gyp`) — it works the
  same way on Windows, Mac, and Linux out of the box.
- **`public/cms.js`** — now fetches content from `/api/collections` instead
  of reading `localStorage`. `portal.js` needed no changes; it still calls
  `cmsGetCollection(key)`, which now reads from an API-backed cache.
- **`public/admin.html`** — now requires login before showing any admin UI,
  and every read/write goes through the API instead of `localStorage`.
- **`public/index.html`** — the old `Cortes__1_.html`, unchanged except for
  the rename.

**Requires Node.js 22.5 or newer** (for built-in SQLite support). Check
your version with `node -v`. You'll see a one-line `ExperimentalWarning:
SQLite is an experimental feature` in the terminal when the server starts
— that's expected and harmless, not an error.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set a real admin password and a random session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste that into `SESSION_SECRET`. Set `ADMIN_PASSWORD` to whatever you want
to log in with (it's hashed in memory at startup — never stored in
plaintext). For production, generate a bcrypt hash instead and use
`ADMIN_PASSWORD_HASH` (see comments in `.env.example`).

## Run

```bash
npm start
```

- Public site: http://localhost:3000
- Admin console: http://localhost:3000/admin (login required)

## How data flows now

- Content collections (news, officials, services, ordinances, budget PDFs,
  etc.) live in `data/cortes.db` (SQLite), seeded on first run with the same
  defaults the admin panel used to seed into `localStorage`.
- Contact form submissions go to the `messages` table and show up in the
  Admin Console's Inbox for **any** admin, from any browser/device — not
  just the browser that submitted them.
- File uploads (budget & youth-plan PDFs) are saved to `/uploads` on the
  server and served back over HTTP, instead of being base64-encoded into
  `localStorage`.
- The public site polls `/api/collections` every 20 seconds and on tab
  focus, so admin edits show up without requiring visitors to hard-refresh.

## Security notes

- The admin login is a single shared account (`ADMIN_USERNAME` /
  `ADMIN_PASSWORD`), not a full user-management system. That matches the
  scope of the original Admin Console, which had no concept of multiple
  users. If you need per-staff accounts and permissions later, that's a
  reasonable next step.
- Sessions are stored server-side in the same SQLite database (`data/cortes.db`)
  and expire after 8 hours.
- Login attempts are rate-limited per IP (8 attempts / 10 minutes) to slow
  down password guessing.
- Uploads are restricted to PDF/PNG/JPEG/WEBP/GIF, capped at 10MB, and
  written under a randomized filename.
- **Before deploying publicly:** put this behind HTTPS (e.g. via a reverse
  proxy or your host's built-in TLS) — session cookies are sent over plain
  HTTP otherwise, and this app does not set `cookie.secure`, since that
  requires HTTPS to work at all locally.

## Deploying

Any host that runs Node works (Render, Railway, Fly.io, a small VPS, etc.).
Make sure:
1. `data/` and `uploads/` are on **persistent** storage (not wiped on
   redeploy) — some platforms use an ephemeral filesystem by default.
2. `.env` is set on the host (never commit your real `.env`).
3. The process is kept alive with something like `pm2` or your platform's
   process manager.
