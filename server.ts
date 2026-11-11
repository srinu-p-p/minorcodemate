import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';

import { config } from './src/server/config.js';
import authRoutes from './src/server/routes/authRoutes.js';
import projectRoutes from './src/server/routes/projectRoutes.js';
import fileRoutes from './src/server/routes/fileRoutes.js';
import taskRoutes from './src/server/routes/taskRoutes.js';
import snapshotRoutes from './src/server/routes/snapshotRoutes.js';
import aiRoutes from './src/server/routes/aiRoutes.js';
import { setupSocketIO } from './src/server/websocket/socketHandler.js';
import { setupYjsWebSocket } from './src/server/websocket/yjsHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Parse JSON payloads up to 10MB (for code snapshots)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS headers for API
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/projects/:projectId/files', fileRoutes);
  app.use('/api/projects/:projectId/tasks', taskRoutes);
  app.use('/api/projects/:projectId/snapshots', snapshotRoutes);
  app.use('/api/ai', aiRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'CodeSync Workspace Server',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // Setup Socket.IO for Presence and Project Notifications
  const io = new SocketIOServer(server, {
    path: '/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  setupSocketIO(io);

  // Setup WebSocket Server for Yjs Document Synchronization
  const yjsWss = new WebSocketServer({ noServer: true });
  setupYjsWebSocket(yjsWss);

  // Handle HTTP upgrade requests between Socket.IO and Yjs WebSocket
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`).pathname;
    if (pathname.startsWith('/yjs-ws')) {
      yjsWss.handleUpgrade(request, socket, head, (ws) => {
        yjsWss.emit('connection', ws, request);
      });
    }
    // Socket.io handles its own upgrade on /socket.io automatically
  });

  // Vite development middleware or static production serve
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Centralized Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err?.message || 'An unexpected error occurred.',
    });
  });

  const port = config.port;
  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 CodeSync Server listening on port ${port} (http://0.0.0.0:${port})`);
    console.log(`📡 WebSocket Yjs endpoint active at ws://localhost:${port}/yjs-ws`);
    console.log(`👥 Socket.IO active at /socket.io`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error in server.ts:', err);
  process.exit(1);
});
