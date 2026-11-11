import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../db.js';

const messageSync = 0;
const messageAwareness = 1;

class WSSharedDoc extends Y.Doc {
  name: string;
  projectId: string;
  fileId: string;
  conns: Set<WebSocket>;
  awareness: awarenessProtocol.Awareness;
  saveTimeout: NodeJS.Timeout | null = null;

  constructor(name: string, projectId: string, fileId: string) {
    super({ gc: true });
    this.name = name;
    this.projectId = projectId;
    this.fileId = fileId;
    this.conns = new Set();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    const awarenessChangeHandler = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      conn: WebSocket | null
    ) => {
      const changedClients = added.concat(updated, removed);
      if (conn !== null) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
        );
        const buff = encoding.toUint8Array(encoder);
        this.conns.forEach((c) => {
          send(this, c, buff);
        });
      }
    };
    this.awareness.on('update', awarenessChangeHandler);

    this.on('update', (update: Uint8Array, origin: any) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((c) => {
        if (c !== origin) {
          send(this, c, buff);
        }
      });

      // Debounce auto-save to database
      this.scheduleSave();
    });
  }

  scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(async () => {
      try {
        const text = this.getText('monaco').toString();
        await prisma.projectFile.update({
          where: { id: this.fileId },
          data: { content: text },
        });
      } catch (err) {
        console.error(`Failed to auto-save Yjs doc for file ${this.fileId}:`, err);
      }
    }, 1500);
  }
}

const docs = new Map<string, WSSharedDoc>();

function send(doc: WSSharedDoc, conn: WebSocket, m: Uint8Array) {
  if (conn.readyState !== WebSocket.OPEN) {
    closeConn(doc, conn);
    return;
  }
  try {
    conn.send(m, (err) => {
      if (err) closeConn(doc, conn);
    });
  } catch {
    closeConn(doc, conn);
  }
}

function closeConn(doc: WSSharedDoc, conn: WebSocket) {
  if (doc.conns.has(conn)) {
    doc.conns.delete(conn);
    // Remove controlled awareness states
    const controlledIds = (conn as any).controlledClientIds as Set<number>;
    if (controlledIds) {
      awarenessProtocol.removeAwarenessStates(
        doc.awareness,
        Array.from(controlledIds),
        null
      );
    }
    if (doc.conns.size === 0) {
      // If no connections, persist final state
      if (doc.saveTimeout) {
        clearTimeout(doc.saveTimeout);
      }
      const text = doc.getText('monaco').toString();
      prisma.projectFile
        .update({
          where: { id: doc.fileId },
          data: { content: text },
        })
        .catch(() => {});
    }
  }
  conn.close();
}

async function getYDoc(name: string, projectId: string, fileId: string): Promise<WSSharedDoc> {
  let doc = docs.get(name);
  if (!doc) {
    doc = new WSSharedDoc(name, projectId, fileId);
    docs.set(name, doc);

    // Seed document with initial file content from DB
    try {
      const file = await prisma.projectFile.findUnique({
        where: { id: fileId },
      });
      if (file && file.content) {
        const ytext = doc.getText('monaco');
        if (ytext.length === 0) {
          ytext.insert(0, file.content);
        }
      }
    } catch (err) {
      console.error('Failed to load initial file content into Y.Doc:', err);
    }
  }
  return doc;
}

export function setupYjsWebSocket(wss: WebSocketServer) {
  wss.on('connection', async (conn: WebSocket, req: IncomingMessage) => {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      // Expected path: /yjs-ws?room=<roomName>&token=<token>
      const room = url.searchParams.get('room') || url.pathname.replace(/^\/yjs-ws\/?/, '') || 'default';
      const token = url.searchParams.get('token');

      // Room format: project:<projectId>:file:<fileId> or <projectId>:<fileId>
      const parts = room.split(':');
      let projectId = '';
      let fileId = '';

      if (parts.length >= 4 && parts[0] === 'project' && parts[2] === 'file') {
        projectId = parts[1];
        fileId = parts[3];
      } else if (parts.length === 2) {
        projectId = parts[0];
        fileId = parts[1];
      } else {
        projectId = 'default';
        fileId = room;
      }

      // Authorization verification
      if (token) {
        try {
          const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
          if (projectId !== 'default') {
            const project = await prisma.project.findUnique({
              where: { id: projectId },
              include: { members: { where: { userId: decoded.id } } },
            });
            if (!project || (project.ownerId !== decoded.id && project.members.length === 0)) {
              conn.close(4003, 'Unauthorized access to project document');
              return;
            }
          }
        } catch {
          conn.close(4001, 'Invalid authentication token');
          return;
        }
      }

      conn.binaryType = 'arraybuffer';
      (conn as any).controlledClientIds = new Set<number>();

      const doc = await getYDoc(room, projectId, fileId);
      doc.conns.add(conn);

      // Send Sync Step 1 to new client
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeSyncStep1(encoder, doc);
      send(doc, conn, encoding.toUint8Array(encoder));

      // Send current awareness states
      const awarenessStates = doc.awareness.getStates();
      if (awarenessStates.size > 0) {
        const awarenessEncoder = encoding.createEncoder();
        encoding.writeVarUint(awarenessEncoder, messageAwareness);
        encoding.writeVarUint8Array(
          awarenessEncoder,
          awarenessProtocol.encodeAwarenessUpdate(
            doc.awareness,
            Array.from(awarenessStates.keys())
          )
        );
        send(doc, conn, encoding.toUint8Array(awarenessEncoder));
      }

      // Handle incoming messages
      conn.on('message', (message: ArrayBuffer) => {
        try {
          const uint8 = new Uint8Array(message);
          const decoder = decoding.createDecoder(uint8);
          const messageType = decoding.readVarUint(decoder);

          switch (messageType) {
            case messageSync: {
              const replyEncoder = encoding.createEncoder();
              encoding.writeVarUint(replyEncoder, messageSync);
              syncProtocol.readSyncMessage(decoder, replyEncoder, doc, conn);
              if (encoding.length(replyEncoder) > 1) {
                send(doc, conn, encoding.toUint8Array(replyEncoder));
              }
              break;
            }
            case messageAwareness: {
              awarenessProtocol.applyAwarenessUpdate(
                doc.awareness,
                decoding.readVarUint8Array(decoder),
                conn
              );
              break;
            }
          }
        } catch (err) {
          console.error('Error handling Yjs websocket message:', err);
        }
      });

      conn.on('close', () => {
        closeConn(doc, conn);
      });

      conn.on('error', () => {
        closeConn(doc, conn);
      });
    } catch (err) {
      console.error('Error in Yjs connection setup:', err);
      conn.close();
    }
  });
}
