const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const authRoutes = require('./router/authRoute');
const userRoutes = require('./router/userRoute');
const conversationRoutes = require('./router/conversationRoute');
const messageRoutes = require('./router/messageRoute');

/*
  The Express app on its own — no http server, no app.listen().

  Two entry points wrap it:
    index.js      long-lived host (local dev, Render, Railway) — adds Socket.IO
    api/index.js  Vercel serverless function — one invocation per request

  Nothing here may assume the process stays alive between requests.
*/

const app = express();

// Vercel terminates TLS at the edge, so req.protocol / req.ip are only
// truthful once the proxy headers are trusted.
app.set('trust proxy', 1);

/*
  CLIENT_URL takes one origin or a comma-separated list; unset means allow-all.

  A browser's `Origin` header is always scheme://host[:port] — never a trailing
  slash, never a path. Pasting "https://app.vercel.app/" into the dashboard
  therefore matches nothing, the preflight comes back without an
  Access-Control-Allow-Origin header, and the browser reports the blocked
  request as a bare "Network Error" with no clue as to why. Normalising both
  sides removes that whole failure mode.
*/
const toOrigin = (value) => {
  try {
    return new URL(value.trim()).origin;
  } catch {
    // Not a parseable URL — fall back to trimming the obvious mistakes so a
    // slightly-off value still has a chance of matching.
    return value.trim().replace(/\/+$/, '').toLowerCase();
  }
};

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map(toOrigin);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header at all: curl, Postman, health checks, same-origin.
      if (!origin) return callback(null, true);
      if (!allowedOrigins.length) return callback(null, true);
      if (allowedOrigins.includes(toOrigin(origin))) return callback(null, true);

      // Log the rejection so the cause is visible in the Vercel function logs
      // instead of only in the browser as an unexplained network failure.
      console.warn(
        `CORS: blocked origin ${origin}. CLIENT_URL allows: ${allowedOrigins.join(', ') || '(none)'}`
      );
      return callback(null, false);
    },
    credentials: allowedOrigins.length > 0,
  })
);

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'chat-api' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    // Public origins, not secrets. Lets you confirm what CLIENT_URL actually
    // parsed to without redeploying to add a console.log.
    allowedOrigins: allowedOrigins.length ? allowedOrigins : 'all (CLIENT_URL not set)',
    requestOrigin: req.headers.origin || null,
  });
});

// A serverless invocation can start with a cold, disconnected mongoose. Every
// request waits on the (cached) connection before a controller touches a model.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(503).json({ message: 'Database unavailable', error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Without this, a throw inside a handler on Vercel surfaces as an opaque
// FUNCTION_INVOCATION_FAILED with nothing in the response body.
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(error.status || 500).json({ message: error.message || 'Internal server error' });
});

module.exports = app;
