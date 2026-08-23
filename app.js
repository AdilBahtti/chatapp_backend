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

// CLIENT_URL takes one origin or a comma-separated list. Unset means
// allow-all, which keeps local dev and preview deployments frictionless.
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : '*',
    credentials: allowedOrigins.length > 0,
  })
);

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'chat-api' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
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
