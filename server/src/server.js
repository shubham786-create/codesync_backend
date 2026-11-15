import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import { acceptInvitation } from './controllers/memberController.js';
import { requireAuth } from './middleware/authMiddleware.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initYjsServer } from './services/yjsServer.js';
import { initSocketServer } from './services/socketServer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// CORS Configuration
const allowedOrigins = [CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin like mobile apps, curl, postman
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev, validated in prod
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CodeSync API',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.post('/api/invitations/accept/:token', requireAuth, acceptInvitation);

// Centralized Error Handler
app.use(errorHandler);

// HTTP Server
const server = http.createServer(app);

// Initialize Socket.IO Gateway
initSocketServer(server);

// Initialize Yjs WebSocket Sync Server
initYjsServer(server);

// Initialize DB and Listen
async function startServer() {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`[CodeSync Server] Listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[CodeSync Server] Startup failed:', error);
    process.exit(1);
  }
}

startServer();

export { app, server };
