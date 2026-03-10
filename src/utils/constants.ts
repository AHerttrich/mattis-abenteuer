/**
 * Game constants — central configuration for all game systems.
 */

// ── World ────────────────────────────────────────────────────
export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;
export const RENDER_DISTANCE = 6;
export const WORLD_SEED = 42;
export const BLOCK_SIZE = 1.0;
export const SEA_LEVEL = 20;

// ── Physics ──────────────────────────────────────────────────
export const GRAVITY = -20.0;
export const PLAYER_SPEED = 5.0;
export const PLAYER_SPRINT_SPEED = 8.0;
export const JUMP_FORCE = 8.0;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_WIDTH = 0.6;
export const PLAYER_EYE_HEIGHT = 1.6;
export const TERMINAL_VELOCITY = -50.0;

// ── Movement Feel ───────────────────────────────────────────
export const HEAD_BOB_SPEED = 10.0; // oscillations per second while walking
export const HEAD_BOB_AMOUNT = 0.06; // vertical displacement in world units
export const HEAD_BOB_SWAY = 0.03; // horizontal sway amount
export const SPRINT_FOV_BOOST = 5; // extra FOV degrees while sprinting
export const ACCELERATION_TIME = 0.12; // seconds to reach full speed
export const LANDING_DIP_AMOUNT = 0.15; // camera dip in world units after landing
export const LANDING_DIP_RECOVERY = 8.0; // recovery speed (units/sec)

// ── Combat ───────────────────────────────────────────────────
export const BASE_PLAYER_HP = 100;
export const BASE_WARRIOR_HP = 50;
export const BASE_ENEMY_HP = 60;
export const MELEE_RANGE = 2.5;
export const CATAPULT_RANGE = 30.0;
export const ATTACK_COOLDOWN = 0.5;
export const CATAPULT_COOLDOWN = 5.0;
export const KNOCKBACK_FORCE = 0.6; // blocks pushed on hit
export const CRIT_CHANCE = 0.15; // 15% chance
export const CRIT_MULTIPLIER = 2.0; // 2× damage on crit

// ── Crafting ─────────────────────────────────────────────────
export const INVENTORY_SIZE = 36;
export const HOTBAR_SIZE = 9;
export const MAX_STACK_SIZE = 64;
export const CRAFT_HAND_GRID = 4; // 2x2
export const CRAFT_TABLE_GRID = 9; // 3x3

// ── Castle ───────────────────────────────────────────────────
export const CASTLE_BUILD_RADIUS = 50;
export const ENEMY_CASTLE_MIN_DISTANCE = 500;
export const ENEMY_CASTLE_MAX_DISTANCE = 800;
export const WARRIOR_SPAWN_INTERVAL = 30.0; // seconds
export const CASTLE_DETECTION_RADIUS = 50;

// ── AI ───────────────────────────────────────────────────────
export const PATHFINDING_MAX_NODES = 1000;
export const AI_UPDATE_INTERVAL = 0.5; // seconds
export const GUARD_PATROL_RADIUS = 10;
export const GUARD_ALERT_RADIUS = 15;
export const GUARD_CHASE_RADIUS = 25;

// ── Rendering ────────────────────────────────────────────────
export const FOV = 75;
export const NEAR_PLANE = 0.1;
export const FAR_PLANE = 500;
export const AMBIENT_LIGHT_INTENSITY = 0.6;
export const DIRECTIONAL_LIGHT_INTENSITY = 0.8;

// ── Game States ──────────────────────────────────────────────
export enum GameState {
  MAIN_MENU = 'main_menu',
  LOADING = 'loading',
  PLAYING = 'playing',
  PAUSED = 'paused',
  INVENTORY = 'inventory',
  CRAFTING = 'crafting',
  VICTORY = 'victory',
  DEFEAT = 'defeat',
}

// ── Events ───────────────────────────────────────────────────
export const Events = {
  // World
  CHUNK_LOADED: 'chunk:loaded',
  CHUNK_UNLOADED: 'chunk:unloaded',
  BLOCK_PLACED: 'block:placed',
  BLOCK_DESTROYED: 'block:destroyed',

  // Projectiles
  PROJECTILE_LAUNCHED: 'projectile:launched',
  ARROW_FIRED: 'arrow:fired',

  // Player
  PLAYER_MOVED: 'player:moved',
  PLAYER_JUMPED: 'player:jumped',
  PLAYER_ATTACKED: 'player:attacked',
  PLAYER_DAMAGED: 'player:damaged',
  PLAYER_DIED: 'player:died',
  PLAYER_STARVING: 'player:starving',

  // Inventory
  ITEM_PICKED_UP: 'item:pickedup',
  ITEM_DROPPED: 'item:dropped',
  ITEM_CRAFTED: 'item:crafted',
  HOTBAR_CHANGED: 'hotbar:changed',

  // Combat
  ENTITY_DAMAGED: 'entity:damaged',
  ENTITY_DIED: 'entity:died',
  ATTACK_HIT: 'attack:hit',
  SHIELD_BLOCK: 'shield:block',
  CRITICAL_HIT: 'critical:hit',
  WARRIOR_KILLED: 'warrior:killed',

  // Castle
  BUILDING_PLACED: 'building:placed',
  BUILDING_DESTROYED: 'building:destroyed',
  WARRIOR_SPAWNED: 'warrior:spawned',
  CASTLE_DAMAGED: 'castle:damaged',
  CASTLE_DESTROYED: 'castle:destroyed',

  // World
  STRUCTURE_DISCOVERED: 'structure:discovered',

  // Game
  GAME_STATE_CHANGED: 'game:statechanged',
  ENEMY_CASTLE_DISCOVERED: 'game:castlediscovered',
  VICTORY: 'game:victory',
  DEFEAT: 'game:defeat',

  // Multiplayer
  MULTIPLAYER_CONNECTED: 'mp:connected',
  MULTIPLAYER_DISCONNECTED: 'mp:disconnected',
} as const;

/** Milliseconds between network position broadcasts. */
export const NETWORK_TICK_RATE = 100;
