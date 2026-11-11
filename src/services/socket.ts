import { io, Socket } from 'socket.io-client';
import { ConnectedCollaborator } from '../types/index.js';

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (!socket) {
    const activeToken = token || localStorage.getItem('codesync_token') || '';
    socket = io(window.location.origin, {
      path: '/socket.io',
      auth: { token: activeToken },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket.IO connection warning:', err.message);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinProjectRoom(
  projectId: string,
  activeFileId?: string,
  activeFilePath?: string
) {
  const s = getSocket();
  if (s.connected) {
    s.emit('project:join', { projectId, activeFileId, activeFilePath });
  } else {
    s.once('connect', () => {
      s.emit('project:join', { projectId, activeFileId, activeFilePath });
    });
  }
}

export function notifyFileFocus(projectId: string, fileId: string, filePath: string) {
  const s = getSocket();
  s.emit('file:focus', { projectId, fileId, filePath });
}

export function broadcastCursorMove(
  projectId: string,
  fileId: string,
  position: { line: number; ch: number }
) {
  const s = getSocket();
  s.emit('cursor:move', { projectId, fileId, position });
}

export function broadcastTaskChange(projectId: string, action: 'create' | 'update' | 'delete', task: any) {
  const s = getSocket();
  s.emit('task:change', { projectId, action, task });
}

export function broadcastSnapshotCreated(projectId: string, snapshot: any) {
  const s = getSocket();
  s.emit('snapshot:created', { projectId, snapshot });
}
