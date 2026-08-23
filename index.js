require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { initSocket } = require('./socket');

/*
  Entry point for hosts that keep a process alive: local dev, Render, Railway,
  Fly, a VPS. This is the only place Socket.IO is started — Vercel's serverless
  functions cannot hold an open WebSocket, so api/index.js skips it.
*/

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  });
