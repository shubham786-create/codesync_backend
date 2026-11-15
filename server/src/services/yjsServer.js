import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { setPersistence, setupWSConnection } from 'y-websocket/bin/utils';
import { mongoYjsPersistence, parseDocName } from './yjsPersistence.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { User } from '../models/User.js';
import { AUTH_COOKIE_NAME } from '../middleware/authMiddleware.js';

// Register MongoDB persistence with y-websocket
setPersistence(mongoYjsPersistence);

export function initYjsServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', async (req, socket, head) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      // Only handle paths starting with /yjs
      if (!url.pathname.startsWith('/yjs')) {
        return; // Handled by Socket.IO or other updaters
      }

      // 1. Authenticate user from cookie or query param
      let token = null;

      // Check cookie
      if (req.headers.cookie) {
        const cookies = Object.fromEntries(
          req.headers.cookie.split(';').map((c) => {
            const [k, ...v] = c.trim().split('=');
            return [k, decodeURIComponent(v.join('='))];
          })
        );
        token = cookies[AUTH_COOKIE_NAME];
      }

      // Fallback: Query param ?token=...
      if (!token) {
        token = url.searchParams.get('token');
      }

      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const secret = process.env.JWT_SECRET || 'super-secret-codesync-jwt-token-change-in-production';
      let decoded;
      try {
        decoded = jwt.verify(token, secret);
      } catch (err) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      // 2. Validate workspace membership
      // Extract docName: pathname can be /yjs/:docName or query ?doc=... or ?room=...
      let docName = url.searchParams.get('room') || url.searchParams.get('doc');
      if (!docName) {
        const parts = url.pathname.replace(/^\/yjs\/?/, '').split('/');
        docName = parts[0];
      }

      if (!docName) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      const { workspaceId, fileId } = parseDocName(docName);
      if (workspaceId) {
        const membership = await WorkspaceMember.findOne({
          workspaceId,
          userId: user._id,
        });

        if (!membership) {
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }

        req.userRole = membership.role;
      }

      req.user = user;
      req.docName = docName;

      // 3. Upgrade connection
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } catch (err) {
      console.error('[Yjs WebSocket] Upgrade error:', err);
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req) => {
    const docName = req.docName;
    console.log(`[Yjs WebSocket] Client connected to doc: ${docName} (${req.user?.name}, role: ${req.userRole})`);

    // Attach y-websocket connection handler
    setupWSConnection(ws, req, { docName });
  });

  return wss;
}
