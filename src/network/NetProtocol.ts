/**
 * NetProtocol — Typed message definitions for peer-to-peer communication.
 */

import type { BlockType } from '../world/BlockType';

// ── Message Types ────────────────────────────────────────────

export enum NetMsgKind {
  PLAYER_MOVE = 'player_move',
  BLOCK_CHANGE = 'block_change',
  COMBAT_EVENT = 'combat_event',
  WARRIOR_SPAWN = 'warrior_spawn',
  WORLD_SEED = 'world_seed',
  CHAT = 'chat',
  PING = 'ping',
  PONG = 'pong',
  // ── Co-op multiplayer sync ──
  WARRIOR_UPDATE = 'warrior_update',
  WARRIOR_REMOVE = 'warrior_remove',
  CASTLE_UPDATE = 'castle_update',
  GAME_OVER = 'game_over',
}

export interface PlayerMoveMsg {
  kind: NetMsgKind.PLAYER_MOVE;
  x: number; y: number; z: number;
  yaw: number; pitch: number;
  t: number; // timestamp
}

export interface BlockChangeMsg {
  kind: NetMsgKind.BLOCK_CHANGE;
  x: number; y: number; z: number;
  blockType: BlockType;
}

export interface CombatEventMsg {
  kind: NetMsgKind.COMBAT_EVENT;
  eventType: 'damage' | 'death';
  entityId: string;
  damage?: number;
  remaining?: number;
  pos?: { x: number; y: number; z: number };
}

export interface WarriorSpawnMsg {
  kind: NetMsgKind.WARRIOR_SPAWN;
  warriorType: string;
  team: 'player' | 'enemy';
  x: number; y: number; z: number;
  sourceCastleId: string;
  targetCastleId: string;
}

export interface WorldSeedMsg {
  kind: NetMsgKind.WORLD_SEED;
  seed: number;
  enemyCastleX: number;
  enemyCastleZ: number;
}

export interface ChatMsg {
  kind: NetMsgKind.CHAT;
  text: string;
}

export interface PingMsg {
  kind: NetMsgKind.PING;
  t: number;
}

export interface PongMsg {
  kind: NetMsgKind.PONG;
  t: number;
}

// ── Co-op sync messages ──────────────────────────────────────

/** Compact warrior state for batch updates from host → guest */
export interface WarriorNetState {
  id: string;
  type: string; // WarriorType
  team: 'player' | 'enemy';
  x: number; y: number; z: number;
  rotY: number;
  hp: number;
  maxHp: number;
  state: string; // AIState
}

export interface WarriorUpdateMsg {
  kind: NetMsgKind.WARRIOR_UPDATE;
  warriors: WarriorNetState[];
}

export interface WarriorRemoveMsg {
  kind: NetMsgKind.WARRIOR_REMOVE;
  entityId: string;
}

export interface CastleUpdateMsg {
  kind: NetMsgKind.CASTLE_UPDATE;
  castleId: string;
  buildingId: string;
  hp: number;
  destroyed: boolean;
}

export interface GameOverMsg {
  kind: NetMsgKind.GAME_OVER;
  result: 'victory' | 'defeat';
  time: number;
}

export type NetMessage =
  | PlayerMoveMsg
  | BlockChangeMsg
  | CombatEventMsg
  | WarriorSpawnMsg
  | WorldSeedMsg
  | ChatMsg
  | PingMsg
  | PongMsg
  | WarriorUpdateMsg
  | WarriorRemoveMsg
  | CastleUpdateMsg
  | GameOverMsg;
