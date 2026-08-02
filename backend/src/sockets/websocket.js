import { Server } from 'socket.io';
import { verifyToken } from '../config/jwt.js';

let io;

export function initWebSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN || '*' },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      socket.user = verifyToken(token);
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Everyone watching the leaderboard joins a per-contest room.
    socket.on('leaderboard:subscribe', (contestId) => {
      socket.join(`leaderboard:${contestId}`);
    });

    // Admin/judge submission-monitoring room.
    socket.on('admin:subscribe', () => {
      if (['admin', 'judge'].includes(socket.user.role)) {
        socket.join('admin-room');
      }
    });
  });

  return io;
}

export function broadcastLeaderboardUpdate(contestId, payload) {
  io?.to(`leaderboard:${contestId}`).emit('leaderboard:update', payload);
}

export function broadcastSubmissionEvent(payload) {
  io?.to('admin-room').emit('admin:submission', payload);
}

export function broadcastContestStateChange(contestId, status) {
  io?.to(`leaderboard:${contestId}`).emit('contest:state', { contestId, status });
}
