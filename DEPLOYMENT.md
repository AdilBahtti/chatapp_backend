# Deploying this backend

## Layout

| File | Role |
| --- | --- |
| `app.js` | The Express app. No `listen()`, no HTTP server — safe to import anywhere. |
| `index.js` | Long-lived host entry (local dev, Render, Railway, VPS). Starts HTTP + **Socket.IO**. |
| `api/index.js` | Vercel serverless entry. Exports the app; **no Socket.IO**. |
| `vercel.json` | Rewrites every path to the `api/index.js` function. |

## Read this before deploying to Vercel

**Vercel cannot run Socket.IO.** Its functions are per-request and are frozen or
destroyed once the response is sent, so nothing can hold the persistent
connection a WebSocket needs. On Vercel this backend serves the full REST API
correctly; `emitToConversation` / `emitToUser` become no-ops, so messages are
saved but **not pushed live** — the other user sees them on refresh or refetch.

Two ways to keep realtime:

1. **Split hosts (recommended).** REST API on Vercel, plus one always-on
   instance of `index.js` on Render/Railway/Fly for sockets. Point the frontend's
   `VITE_API_URL` at Vercel and `VITE_SOCKET_URL` at the socket host. Both read
   the same `MONGODB_URL`, so no code changes are needed — the frontend already
   reads those two variables separately.
2. **One always-on host.** Skip Vercel for the backend and deploy `index.js` to
   Render/Railway. Simplest option; realtime works exactly as it does locally.

## Vercel setup

1. Import `AdilBahtti/chatapp_backend` in Vercel. Framework preset: **Other**.
   Leave build/output commands empty — `api/index.js` is detected automatically.
2. Settings → Environment Variables:
   - `MONGODB_URL` — Atlas connection string, database name included.
   - `JWT_SECRET` — must be identical to whatever signed existing tokens.
   - `CLIENT_URL` — the deployed frontend origin, e.g.
     `https://your-frontend.vercel.app`. Comma-separated for several. Leave unset
     to allow all origins.
   - Do **not** set `PORT`; Vercel assigns it.
3. MongoDB Atlas → Network Access → allow `0.0.0.0/0`. Vercel functions have no
   fixed egress IP, so an allow-list of specific addresses will time out.
4. Deploy, then check `https://<project>.vercel.app/api/health` — it answers
   `200` even when Mongo is down, which separates "app broken" from "DB broken".

## Frontend

Set on the frontend project (Vite reads these at build time, not runtime):

```
VITE_API_URL=https://<project>.vercel.app/api
VITE_SOCKET_URL=https://<your-socket-host>   # only if using the split-host setup
```

## Local

```bash
npm install
cp .env.example .env   # then fill it in
npm run dev            # index.js — REST + sockets on PORT
```
