/*
  Vercel serverless entry point.

  Vercel discovers this file, wraps the exported Express app as a Node function,
  and vercel.json rewrites every incoming path to it — so `req.url` still reads
  `/api/messages/123` and the app's own routing does the rest.

  Socket.IO is deliberately absent: a function instance is torn down after the
  response, so it cannot hold the long-lived connection a WebSocket needs. The
  socket helpers in ../socket use optional chaining on a null `io`, which means
  the REST endpoints keep working and simply emit nothing here.
*/

const app = require('../app');

module.exports = app;
