/*
  Vercel serverless entry point — named explicitly in vercel.json's `builds`,
  so there is no auto-detection to get wrong. Every path is routed here and
  Express does the rest; `req.url` arrives unchanged.

  Socket.IO is deliberately absent. A function instance is destroyed once the
  response is sent, so it cannot hold the long-lived connection a WebSocket
  needs. The helpers in ../socket use optional chaining on a null `io`, so the
  REST endpoints work normally here and simply emit nothing.
*/

let app;
let loadError = null;

/*
  If requiring the app throws — a missing dependency, a bad env var read at
  module scope, a syntax error — Vercel has no handler to call and reports a
  bare 500 FUNCTION_INVOCATION_FAILED with the real cause buried in the runtime
  logs. Catching it lets the response itself carry the reason.
*/
try {
  app = require('../app');
} catch (error) {
  loadError = error;
  console.error('Failed to load Express app:', error);
}

module.exports = (req, res) => {
  if (loadError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        message: 'Backend failed to start',
        error: loadError.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : loadError.stack,
      })
    );
  }

  // Insurance only: the legacy `routes` config preserves the original URL, but
  // if a platform change ever handed us the destination file path instead,
  // Express would 404 every request with no clue why.
  if (req.url === '/api/index.js' || req.url.startsWith('/api/index.js?')) {
    req.url = req.url.replace('/api/index.js', '') || '/';
  }

  return app(req, res);
};
