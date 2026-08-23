const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../model/user');
const Conversation = require('../model/coversation');

/*
  The realtime layer. Everything the REST API writes is still written by the
  REST API — sockets only announce what happened, so a client that misses an
  event can always recover by refetching.

  Rooms
    user:<userId>          every socket of one person (multi-tab safe)
    conversation:<convId>  everyone in a chat, joined on connect
*/

let io = null;

// userId -> Set of socket ids. A user is "offline" only when the last tab goes.
const onlineUsers = new Map();

const userRoom = (userId) => `user:${userId}`;
const conversationRoom = (conversationId) => `conversation:${conversationId}`;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
    },
  });

  // Same JWT the REST middleware checks, handed over on the handshake instead
  // of a header — an unauthenticated socket never reaches a room.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (!token) {
      return next(new Error('Access denied. No token provided.'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = String(decoded.id || decoded._id);
      return next();
    } catch (error) {
      return next(new Error('Invalid token.'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId } = socket;

    socket.join(userRoom(userId));

    const isFirstSocket = !onlineUsers.has(userId);
    if (isFirstSocket) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    try {
      const conversations = await Conversation.find({ members: userId }).select('_id');
      conversations.forEach((conversation) => socket.join(conversationRoom(conversation._id)));
    } catch (error) {
      console.error('Socket room join failed:', error.message);
    }

    // Whoever just arrived needs the current picture; everyone else only needs the delta.
    socket.emit('presence:list', [...onlineUsers.keys()]);

    if (isFirstSocket) {
      try {
        await User.findByIdAndUpdate(userId, { isOnline: true });
      } catch (error) {
        console.error('Presence update failed:', error.message);
      }
      socket.broadcast.emit('presence:update', { userId, isOnline: true });
    }

    // Late-created conversations aren't in the connect-time join, so the client
    // asks explicitly when it opens one.
    socket.on('conversation:join', (conversationId) => {
      if (conversationId) socket.join(conversationRoom(conversationId));
    });

    socket.on('typing:start', ({ conversationId, username }) => {
      if (!conversationId) return;
      socket.to(conversationRoom(conversationId)).emit('typing:start', {
        conversationId,
        userId,
        username,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(conversationRoom(conversationId)).emit('typing:stop', {
        conversationId,
        userId,
      });
    });

    socket.on('disconnect', async () => {
      const sockets = onlineUsers.get(userId);
      if (!sockets) return;

      sockets.delete(socket.id);
      if (sockets.size > 0) return;

      onlineUsers.delete(userId);
      const lastSeen = new Date();
      try {
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
      } catch (error) {
        console.error('Presence update failed:', error.message);
      }
      io.emit('presence:update', { userId, isOnline: false, lastSeen });
    });
  });

  return io;
};

const getIO = () => io;

const emitToConversation = (conversationId, event, payload) => {
  io?.to(conversationRoom(conversationId)).emit(event, payload);
};

const emitToUser = (userId, event, payload) => {
  io?.to(userRoom(userId)).emit(event, payload);
};

// Pull every socket a user has open into a room they were not connected for.
const joinUserToConversation = (userId, conversationId) => {
  io?.in(userRoom(userId)).socketsJoin(conversationRoom(conversationId));
};

const isUserOnline = (userId) => onlineUsers.has(String(userId));

module.exports = {
  initSocket,
  getIO,
  emitToConversation,
  emitToUser,
  joinUserToConversation,
  isUserOnline,
};
