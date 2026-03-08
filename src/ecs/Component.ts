/**
 * Component — Base interface for all ECS components.
 *
 * Components are pure data containers. They hold state but
 * contain NO logic. Systems process components.
 */

export interface Component {
  readonly type: string;
}

/**
 * PositionComponent — 3D position in world space.
 */
export interface PositionComponent extends Component {
  type: 'position';
  x: number;
  y: number;
  z: number;
  rotationY?: number;
}

/**
 * RotationComponent — Euler rotation.
 */
export interface RotationComponent extends Component {
  type: 'rotation';
  x: number;
  y: number;
  z: number;
}

/**
 * VelocityComponent — Movement vector.
 */
export interface VelocityComponent extends Component {
  type: 'velocity';
  x: number;
  y: number;
  z: number;
}

/**
 * HealthComponent — Hit points and armor.
 */
export interface HealthComponent extends Component {
  type: 'health';
  current: number;
  max: number;
  armor: number;
  isDead: boolean;
}

/**
 * CombatComponent — Attack stats.
 */
export interface CombatComponent extends Component {
  type: 'combat';
  damage: number;
  attackSpeed: number;
  range: number;
  lastAttackTime: number;
  knockback: number;
}

/**
 * AIComponent — AI behavior state.
 */
export interface AIComponent extends Component {
  type: 'ai';
  state: AIState;
  targetEntityId: string | null;
  patrolOrigin: { x: number; y: number; z: number } | null;
  patrolRadius: number;
  alertRadius: number;
  chaseRadius: number;
}

export enum AIState {
  IDLE = 'idle',
  PATROL = 'patrol',
  ALERT = 'alert',
  CHASE = 'chase',
  ATTACK = 'attack',
  MARCH = 'march',
  RETREAT = 'retreat',
  FLEE = 'flee',
}

/**
 * RenderComponent — Visual representation tag.
 */
export interface RenderComponent extends Component {
  type: 'render';
  meshId: string;
  color: number;
  scale: number;
  visible: boolean;
}

/**
 * ColliderComponent — Axis-aligned bounding box.
 */
export interface ColliderComponent extends Component {
  type: 'collider';
  width: number;
  height: number;
  depth: number;
  isStatic: boolean;
}

/**
 * TeamComponent — Faction affiliation.
 */
export interface TeamComponent extends Component {
  type: 'team';
  team: 'player' | 'enemy' | 'neutral';
}

/**
 * WarriorComponent — Warrior-specific data.
 */
export interface WarriorComponent extends Component {
  type: 'warrior';
  warriorType: WarriorType;
  sourceCastleId: string;
  targetCastleId: string;
}

export enum WarriorType {
  SWORDSMAN = 'swordsman',
  ARCHER = 'archer',
  CAVALRY = 'cavalry',
  CATAPULT_OPERATOR = 'catapult_operator',
  SHIELD_BEARER = 'shield_bearer',
  CASTLE_BOSS = 'castle_boss',
}

/**
 * Factory functions for creating components with defaults.
 */
export function createPosition(x = 0, y = 0, z = 0): PositionComponent {
  return { type: 'position', x, y, z };
}

export function createRotation(x = 0, y = 0, z = 0): RotationComponent {
  return { type: 'rotation', x, y, z };
}

export function createVelocity(x = 0, y = 0, z = 0): VelocityComponent {
  return { type: 'velocity', x, y, z };
}

export function createHealth(max: number, armor = 0): HealthComponent {
  return { type: 'health', current: max, max, armor, isDead: false };
}

export function createCombat(
  damage: number,
  attackSpeed = 1.0,
  range = 2.0,
  knockback = 0.5,
): CombatComponent {
  return { type: 'combat', damage, attackSpeed, range, lastAttackTime: 0, knockback };
}

export function createAI(
  patrolRadius = 10,
  alertRadius = 15,
  chaseRadius = 25,
): AIComponent {
  return {
    type: 'ai',
    state: AIState.IDLE,
    targetEntityId: null,
    patrolOrigin: null,
    patrolRadius,
    alertRadius,
    chaseRadius,
  };
}

export function createRender(color: number, scale = 1): RenderComponent {
  return { type: 'render', meshId: '', color, scale, visible: true };
}

export function createCollider(
  width: number,
  height: number,
  depth: number,
  isStatic = false,
): ColliderComponent {
  return { type: 'collider', width, height, depth, isStatic };
}

export function createTeam(team: 'player' | 'enemy' | 'neutral'): TeamComponent {
  return { type: 'team', team };
}

export function createWarrior(
  warriorType: WarriorType,
  sourceCastleId: string,
  targetCastleId: string,
): WarriorComponent {
  return { type: 'warrior', warriorType, sourceCastleId, targetCastleId };
}
