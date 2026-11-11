import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../db.js';

interface ConnectedUser {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  projectId: string;
  activeFileId?: string;
  activeFilePath?: string;
  cursor?: { line: number; ch: number };
  color: string;
}

const COLLABORATOR_COLORS = [
  '#38bdf8', // sky
  '#a855f7', // purple
  '#22c55e', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#8b5cf6', // violet
];

export function setupSocketIO(io: SocketIOServer) {
  // In-memory presence map: projectId -> Map<socketId, ConnectedUser>
  const projectPresence = new Map<string, Map<string, ConnectedUser>>();

  // Socket middleware for JWT verification
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization?.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.split(' ')[1]
          : null);

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, config.jwtSecret) as {
        id: string;
        email: string;
        name: string;
      };

      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as { id: string; email: string; name: string };
    let currentProjectId: string | null = null;

    // Assign color based on user id hash
    const colorIndex =
      Math.abs(user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) %
      COLLABORATOR_COLORS.length;
    const userColor = COLLABORATOR_COLORS[colorIndex];

    // Join Project Room
    socket.on('project:join', async ({ projectId, activeFileId, activeFilePath }) => {
      try {
        // Verify project membership
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          include: { members: { where: { userId: user.id } } },
        });

        if (!project || (project.ownerId !== user.id && project.members.length === 0)) {
          socket.emit('error', { message: 'Access denied to project room.' });
          return;
        }

        currentProjectId = projectId;
        socket.join(`project:${projectId}`);

        if (!projectPresence.has(projectId)) {
          projectPresence.set(projectId, new Map());
        }

        const roomMap = projectPresence.get(projectId)!;
        const presenceEntry: ConnectedUser = {
          socketId: socket.id,
          userId: user.id,
          name: user.name,
          email: user.email,
          projectId,
          activeFileId,
          activeFilePath,
          color: userColor,
        };

        roomMap.set(socket.id, presenceEntry);

        // Broadcast updated presence list to room
        io.to(`project:${projectId}`).emit('presence:list', Array.from(roomMap.values()));
      } catch (err: any) {
        socket.emit('error', { message: err?.message });
      }
    });

    // File switch event
    socket.on('file:focus', ({ projectId, fileId, filePath }) => {
      if (currentProjectId && projectPresence.has(currentProjectId)) {
        const roomMap = projectPresence.get(currentProjectId)!;
        const userEntry = roomMap.get(socket.id);
        if (userEntry) {
          userEntry.activeFileId = fileId;
          userEntry.activeFilePath = filePath;
          io.to(`project:${currentProjectId}`).emit('presence:list', Array.from(roomMap.values()));
        }
      }
    });

    // Cursor position broadcast
    socket.on('cursor:move', ({ projectId, fileId, position }) => {
      if (currentProjectId) {
        socket.to(`project:${projectId}`).emit('collaborator:cursor', {
          socketId: socket.id,
          userId: user.id,
          name: user.name,
          color: userColor,
          fileId,
          position,
        });
      }
    });

    // Task board sync
    socket.on('task:change', ({ projectId, action, task }) => {
      if (currentProjectId === projectId) {
        socket.to(`project:${projectId}`).emit('task:sync', {
          action,
          task,
          authorName: user.name,
        });
      }
    });

    // Snapshot notification
    socket.on('snapshot:created', ({ projectId, snapshot }) => {
      if (currentProjectId === projectId) {
        socket.to(`project:${projectId}`).emit('snapshot:notification', {
          snapshot,
          creatorName: user.name,
        });
      }
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      if (currentProjectId && projectPresence.has(currentProjectId)) {
        const roomMap = projectPresence.get(currentProjectId)!;
        roomMap.delete(socket.id);
        if (roomMap.size === 0) {
          projectPresence.delete(currentProjectId);
        } else {
          io.to(`project:${currentProjectId}`).emit('presence:list', Array.from(roomMap.values()));
        }
      }
    });
  });
}
