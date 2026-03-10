/**
 * NetworkManager — PeerJS-based WebRTC peer-to-peer networking.
 *
 * Host creates a room code; client joins via that code.
 * All communication happens over a reliable DataChannel.
 */

import Peer, { DataConnection } from 'peerjs';
import type { NetMessage } from './NetProtocol';
import { NetMsgKind } from './NetProtocol';

type MessageHandler = (msg: NetMessage) => void;
type StatusHandler = (status: 'connected' | 'disconnected' | 'error', info?: string) => void;

const ROOM_PREFIX = 'mattis-abenteuer-';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export class NetworkManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private messageHandlers: MessageHandler[] = [];
  private statusHandlers: StatusHandler[] = [];
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private _isHost = false;
  private _isConnected = false;
  private _roomCode = '';

  get isHost(): boolean {
    return this._isHost;
  }
  get isConnected(): boolean {
    return this._isConnected;
  }
  get roomCode(): string {
    return this._roomCode;
  }

  /** Host a game — creates a Peer and waits for a connection. */
  host(): Promise<string> {
    return new Promise((resolve, reject) => {
      this._isHost = true;
      this._roomCode = generateRoomCode();
      const peerId = ROOM_PREFIX + this._roomCode;

      this.peer = new Peer(peerId);

      this.peer.on('open', () => {
        resolve(this._roomCode);
      });

      this.peer.on('connection', (conn) => {
        this.conn = conn;
        this.setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        this.emitStatus('error', err.message);
        reject(err);
      });
    });
  }

  /** Join a game by room code. */
  join(roomCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this._isHost = false;
      this._roomCode = roomCode.toUpperCase();
      const peerId = 'mattis-guest-' + Math.random().toString(36).substring(2, 8);

      this.peer = new Peer(peerId);

      this.peer.on('open', () => {
        const hostId = ROOM_PREFIX + this._roomCode;
        this.conn = this.peer!.connect(hostId, { reliable: true });
        this.setupConnection(this.conn);
        resolve();
      });

      this.peer.on('error', (err) => {
        this.emitStatus('error', err.message);
        reject(err);
      });
    });
  }

  /** Send a message to the peer. */
  send(msg: NetMessage): void {
    if (this.conn && this.conn.open) {
      this.conn.send(msg);
    }
  }

  /** Register a message handler. */
  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  /** Register a status change handler. */
  onStatus(handler: StatusHandler): void {
    this.statusHandlers.push(handler);
  }

  /** Disconnect and clean up. */
  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this._isConnected = false;
    this.emitStatus('disconnected');
  }

  private setupConnection(conn: DataConnection): void {
    conn.on('open', () => {
      this._isConnected = true;
      this.emitStatus('connected');
      this.startHeartbeat();
    });

    conn.on('data', (data) => {
      const msg = data as NetMessage;
      // Auto-handle ping/pong
      if (msg.kind === NetMsgKind.PING) {
        this.send({ kind: NetMsgKind.PONG, t: msg.t });
        return;
      }
      for (const handler of this.messageHandlers) {
        handler(msg);
      }
    });

    conn.on('close', () => {
      this._isConnected = false;
      this.emitStatus('disconnected');
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    });

    conn.on('error', (err) => {
      this.emitStatus('error', err.message);
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this._isConnected) {
        this.send({ kind: NetMsgKind.PING, t: Date.now() });
      }
    }, 2000);
  }

  private emitStatus(status: 'connected' | 'disconnected' | 'error', info?: string): void {
    for (const handler of this.statusHandlers) {
      handler(status, info);
    }
  }
}
