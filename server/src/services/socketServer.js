import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { Message } from '../models/Message.js';
import { AUTH_COOKIE_NAME } from '../middleware/authMiddleware.js';

// Tracks online users per workspace: workspaceId -> Map(socketId -> { userId, name, avatarColor, role })
const presenceMap = new Map();

function sanitizeText(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: [process.env.CLIENT_ORIGIN || 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Handshake Authentication Middleware
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      // Check cookies from handshake headers
      if (!token && socket.handshake.headers.cookie) {
        const cookies = Object.fromEntries(
          socket.handshake.headers.cookie.split(';').map((c) => {
            const [k, ...v] = c.trim().split('=');
            return [k, decodeURIComponent(v.join('='))];
          })
        );
        token = cookies[AUTH_COOKIE_NAME];
      }

      if (!token) {
        return next(new Error('Authentication required for WebSocket connection'));
      }

      const secret = process.env.JWT_SECRET || 'super-secret-codesync-jwt-token-change-in-production';
      const decoded = jwt.verify(token, secret);

      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    let currentWorkspaceId = null;

    // Join Workspace Room
    socket.on('workspace:join', async ({ workspaceId }) => {
      try {
        if (!workspaceId) return;

        // Verify membership in database
        const member = await WorkspaceMember.findOne({
          workspaceId,
          userId: user._id,
        });

        if (!member) {
          socket.emit('error', { message: 'Not authorized to join this workspace' });
          return;
        }

        // Leave previous workspace room if any
        if (currentWorkspaceId) {
          socket.leave(`workspace:${currentWorkspaceId}`);
          leavePresence(currentWorkspaceId, socket.id);
        }

        currentWorkspaceId = workspaceId;
        const roomName = `workspace:${workspaceId}`;
        socket.join(roomName);

        // Add to presence
        if (!presenceMap.has(workspaceId)) {
          presenceMap.set(workspaceId, new Map());
        }
        presenceMap.get(workspaceId).set(socket.id, {
          userId: user._id.toString(),
          name: user.name,
          avatarColor: user.avatarColor,
          role: member.role,
        });

        // Broadcast updated presence
        broadcastPresence(io, workspaceId);
      } catch (err) {
        console.error('[Socket.IO] workspace:join error:', err);
      }
    });

    // Chat Message Send
    socket.on('chat:send', async ({ workspaceId, content }) => {
      try {
        if (!workspaceId || !content || !content.trim()) return;

        // Verify membership
        const member = await WorkspaceMember.findOne({
          workspaceId,
          userId: user._id,
        });
        if (!member) return;

        const cleanContent = sanitizeText(content.trim().slice(0, 2000));

        const msg = await Message.create({
          workspaceId,
          senderId: user._id,
          senderName: user.name,
          senderColor: user.avatarColor,
          content: cleanContent,
        });

        const payload = {
          id: msg._id.toString(),
          senderId: user._id.toString(),
          senderName: user.name,
          senderColor: user.avatarColor,
          content: cleanContent,
          createdAt: msg.createdAt,
        };

        io.to(`workspace:${workspaceId}`).emit('chat:message', payload);
      } catch (err) {
        console.error('[Socket.IO] chat:send error:', err);
      }
    });

    // File Operation Broadcasts (syncs file tree across users)
    socket.on('file:created', ({ workspaceId, file }) => {
      socket.to(`workspace:${workspaceId}`).emit('file:created', file);
    });

    socket.on('file:renamed', ({ workspaceId, file }) => {
      socket.to(`workspace:${workspaceId}`).emit('file:renamed', file);
    });

    socket.on('file:deleted', ({ workspaceId, fileId }) => {
      socket.to(`workspace:${workspaceId}`).emit('file:deleted', fileId);
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (currentWorkspaceId) {
        leavePresence(currentWorkspaceId, socket.id);
        broadcastPresence(io, currentWorkspaceId);
      }
    });
  });

  function leavePresence(workspaceId, socketId) {
    if (presenceMap.has(workspaceId)) {
      presenceMap.get(workspaceId).delete(socketId);
      if (presenceMap.get(workspaceId).size === 0) {
        presenceMap.delete(workspaceId);
      }
    }
  }

  function broadcastPresence(io, workspaceId) {
    if (!presenceMap.has(workspaceId)) {
      io.to(`workspace:${workspaceId}`).emit('workspace:presence', []);
      return;
    }

    // Deduplicate by userId
    const userMap = new Map();
    presenceMap.get(workspaceId).forEach((val) => {
      userMap.set(val.userId, val);
    });

    const activeUsers = Array.from(userMap.values());
    io.to(`workspace:${workspaceId}`).emit('workspace:presence', activeUsers);
  }

  return io;
}
