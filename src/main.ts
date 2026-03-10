/**
 * Mattis Abenteuer — Main Game Entry Point (Complete Build)
 *
 * All game systems integrated:
 * - Three.js renderer + dynamic sky + day/night + water shaders
 * - Procedural voxel world with 6 biomes + structures (dungeons/ruins/villages)
 * - First-person player with hunger, fall damage, sprint gating
 * - 50+ items, 30+ recipes, crafting UI, mining with tool speed
 * - Castle warfare: warriors, AI, catapult projectiles, AOE destruction
 * - Castle building mode (B key) with material costs
 * - Particles: block-breaking + explosions
 * - Minimap, pause menu, tutorial system, death screen
 * - 16 achievements tracking progression
 * - Procedural sound effects (Web Audio)
 * - Save/load (F5/F9) + auto-save every 60s
 * - Torch flickering point lights
 */

import * as THREE from 'three';
import {
  FOV,
  NEAR_PLANE,
  FAR_PLANE,
  AMBIENT_LIGHT_INTENSITY,
  DIRECTIONAL_LIGHT_INTENSITY,
  WORLD_SEED,
  BASE_PLAYER_HP,
  CHUNK_SIZE,
} from './utils/constants';
import { eventBus, Events } from './utils';
import { ECSWorld } from './ecs';
import type { PositionComponent, TeamComponent } from './ecs/Component';
import { InputManager } from './engine/InputManager';
import { DayNightCycle } from './engine/DayNightCycle';
import { GameManager } from './engine/GameManager';
import { soundManager } from './engine/SoundManager';
import { SaveSystem } from './engine/SaveSystem';
import { AchievementSystem } from './engine/AchievementSystem';
import { WorldGenerator } from './world/WorldGenerator';
import { ChunkManager } from './world/ChunkManager';
import { TextureAtlas } from './world/TextureAtlas';
import { StructureGenerator } from './world/StructureGenerator';
import { PlayerController } from './player/PlayerController';
import { HungerSystem } from './player/HungerSystem';
import { Inventory } from './crafting/Inventory';
import { CraftingSystem, CraftingStation } from './crafting/CraftingSystem';
import { getItemDef } from './crafting/Item';
import { BlockType, getBlockProperties } from './world/BlockType';
import { Castle, BuildingType } from './castle/Castle';
import { EnemyCastleGenerator } from './castle/EnemyCastleGenerator';
import { CombatSystem } from './combat/CombatSystem';
import { ProjectileSystem } from './combat/ProjectileSystem';
import { WarriorManager } from './entities/WarriorManager';
import { HUD } from './ui/HUD';
import { CraftingUI } from './ui/CraftingUI';
import { BlockHighlight } from './ui/BlockHighlight';
import { Minimap } from './ui/Minimap';
import { CastleBuildUI } from './ui/CastleBuildUI';
import { BaseBuildView } from './ui/BaseBuildView';
import { PauseMenu } from './ui/PauseMenu';
import { TutorialSystem } from './ui/TutorialSystem';
import { DeathScreen } from './ui/DeathScreen';
import { DamageNumbers } from './ui/DamageNumbers';
import { MultiplayerMenu } from './ui/MultiplayerMenu';
import { ScoreDashboard } from './ui/ScoreDashboard';
import { InventoryUI } from './ui/InventoryUI';
import { WaveManager, WaveEvents } from './engine/WaveManager';
import { CaveMobSystem } from './entities/CaveMobSystem';
import { VillagerSystem } from './entities/VillagerSystem';
import { TradingUI } from './ui/TradingUI';
import { MountSystem } from './entities/MountSystem';
import { WarriorType } from './ecs/Component';
import { ParticleSystem } from './effects/ParticleSystem';
import { SkySystem } from './effects/SkySystem';
import { TorchLightManager } from './effects/TorchLight';
import { PostProcessingPipeline } from './effects/PostProcessing';
import { WeatherSystem } from './effects/WeatherSystem';
import { NetworkManager } from './network/NetworkManager';
import { NetMsgKind } from './network/NetProtocol';
import type { NetMessage, WarriorNetState } from './network/NetProtocol';
import { RemotePlayer } from './entities/RemotePlayer';
import { NETWORK_TICK_RATE } from './utils/constants';
import { XPSystem } from './engine/XPSystem';
import { FarmingSystem } from './engine/FarmingSystem';
import { QuestSystem } from './engine/QuestSystem';
import { PotionSystem } from './engine/PotionSystem';
import { AmbientSoundSystem } from './engine/AmbientSoundSystem';
import { EnchantSystem } from './engine/EnchantSystem';

// ── Three.js Setup ───────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.007);

const camera = new THREE.PerspectiveCamera(
  FOV,
  window.innerWidth / window.innerHeight,
  NEAR_PLANE,
  FAR_PLANE,
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ── Lighting ─────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, AMBIENT_LIGHT_INTENSITY);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffeedd, DIRECTIONAL_LIGHT_INTENSITY);
sunLight.position.set(100, 150, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 300;
sunLight.shadow.camera.left = -80;
sunLight.shadow.camera.right = 80;
sunLight.shadow.camera.top = 80;
sunLight.shadow.camera.bottom = -80;
scene.add(sunLight);
scene.add(sunLight.target);

// ── Core Systems ─────────────────────────────────────────────
const ecsWorld = new ECSWorld();
const input = new InputManager();
input.init(renderer.domElement);
const worldGen = new WorldGenerator(WORLD_SEED);
const textureAtlas = new TextureAtlas();
const chunkManager = new ChunkManager(scene, worldGen, textureAtlas);
const structGen = new StructureGenerator(WORLD_SEED);
const player = new PlayerController(camera, input, chunkManager);
const hunger = new HungerSystem();
const inventory = new Inventory();
const crafting = new CraftingSystem();
const combat = new CombatSystem(ecsWorld);
const projectiles = new ProjectileSystem(scene, chunkManager);
const saveSystem = new SaveSystem();
const achievements = new AchievementSystem();
soundManager.init();

// UI
const hud = new HUD();
const blockHighlight = new BlockHighlight(scene);
const craftingUI = new CraftingUI(crafting, inventory);
const minimap = new Minimap();
const pauseMenu = new PauseMenu();
const tutorial = new TutorialSystem();
const deathScreen = new DeathScreen();
const inventoryUI = new InventoryUI(inventory);

// Effects
const particles = new ParticleSystem(scene);
const sky = new SkySystem(scene);
const torchLights = new TorchLightManager(scene);
const postProcessing = new PostProcessingPipeline(renderer, scene, camera);
const weather = new WeatherSystem(scene, worldGen);

// Multiplayer
const networkManager = new NetworkManager();
const multiplayerMenu = new MultiplayerMenu(networkManager);
const remotePlayer = new RemotePlayer(scene, camera);
let lastNetSendTime = 0;
let lastWarriorSyncTime = 0;
const WARRIOR_SYNC_RATE = 200; // ms between warrior state broadcasts

/** True when this client is connected as a guest (not host). */
function isGuest(): boolean {
  return networkManager.isConnected && !networkManager.isHost;
}

multiplayerMenu.setConnectedCallback(() => {
  hud.showInfo('🌐 Multiplayer Connected!', 3000);
  // Host sends world seed + enemy castle coords to client
  if (networkManager.isHost) {
    networkManager.send({
      kind: NetMsgKind.WORLD_SEED,
      seed: WORLD_SEED,
      enemyCastleX: ecX,
      enemyCastleZ: ecZ,
    });
  }
});

networkManager.onMessage((msg: NetMessage) => {
  switch (msg.kind) {
    case NetMsgKind.PLAYER_MOVE:
      remotePlayer.setTarget(msg.x, msg.y, msg.z, msg.yaw);
      break;
    case NetMsgKind.BLOCK_CHANGE:
      chunkManager.setBlockAtWorld(msg.x, msg.y, msg.z, msg.blockType);
      break;
    case NetMsgKind.COMBAT_EVENT:
      if (msg.eventType === 'damage' && msg.pos) {
        eventBus.emit(Events.ENTITY_DAMAGED, {
          entityId: msg.entityId,
          damage: msg.damage,
          remaining: msg.remaining,
          pos: msg.pos,
        });
      } else if (msg.eventType === 'death' && msg.pos) {
        eventBus.emit(Events.ENTITY_DIED, { entityId: msg.entityId, pos: msg.pos });
      }
      break;
    case NetMsgKind.WORLD_SEED: {
      // Client: reinitialize world with host's seed
      // eslint-disable-next-line no-console
      console.log(
        `[MP] Received world seed: ${msg.seed}, enemy castle: (${msg.enemyCastleX}, ${msg.enemyCastleZ})`,
      );
      // Reinitialize world generator with host's seed
      const newWorldGen = new WorldGenerator(msg.seed);
      // Replace references — reassign the world generator
      Object.assign(worldGen, newWorldGen);
      // Clear old chunks and swap the chunk manager internals
      chunkManager.replaceGenerator(newWorldGen);
      // Update enemy castle position to match host
      Object.assign(enemyCastle, { x: msg.enemyCastleX, z: msg.enemyCastleZ });
      warriorManager.setEnemyCastlePos(msg.enemyCastleX, msg.enemyCastleZ);
      // Reset castle placement flags so they re-place on new terrain
      enemyCastlePlaced = false;
      playerCastlePlaced = false;
      hud.showInfo('🌍 World synchronized with host!', 3000);
      // Force re-load chunks around player
      chunkManager.update(player.x, player.z);
      break;
    }
    case NetMsgKind.WARRIOR_UPDATE:
      // Guest: update warrior meshes from host data
      warriorManager.updateFromNetwork(msg.warriors);
      break;
    case NetMsgKind.WARRIOR_REMOVE:
      // Guest: remove dead warrior
      warriorManager.removeWarriorFromNetwork(msg.entityId);
      break;
    case NetMsgKind.CASTLE_UPDATE: {
      // Guest: update castle building HP
      const castle = msg.castleId === playerCastle.id ? playerCastle : enemyCastle;
      const bld = castle.buildings.find((b) => b.id === msg.buildingId);
      if (bld) {
        bld.hp = msg.hp;
        if (msg.destroyed && bld.type === 'throne') {
          eventBus.emit(Events.CASTLE_DESTROYED, { castleId: msg.castleId, owner: castle.owner });
        }
      }
      break;
    }
    case NetMsgKind.GAME_OVER: {
      // Guest: show full-screen victory/defeat overlay (same as host)
      const overlay = document.createElement('div');
      overlay.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:500;display:flex;flex-direction:column;align-items:center;justify-content:center;animation:fadeIn 1s;';
      if (msg.result === 'victory') {
        const mins = Math.floor(msg.time / 60),
          secs = Math.floor(msg.time % 60);
        overlay.innerHTML = `
          <h1 style="font-size:64px;color:#f1c40f;text-shadow:4px 4px 8px #000;">🏆 VICTORY! 🏆</h1>
          <p style="font-size:24px;color:#2ecc71;margin-top:20px;">The enemy castle has been destroyed!</p>
          <p style="font-size:18px;color:#bdc3c7;margin-top:10px;">Time: ${mins}m ${secs}s</p>
          <p style="font-size:16px;color:#7f8c8d;margin-top:40px;">Refresh to play again</p>
          <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}</style>
        `;
        soundManager.playVictory();
      } else {
        const mins = Math.floor(msg.time / 60),
          secs = Math.floor(msg.time % 60);
        overlay.innerHTML = `
          <h1 style="font-size:64px;color:#e74c3c;text-shadow:4px 4px 8px #000;">💀 DEFEAT 💀</h1>
          <p style="font-size:24px;color:#e74c3c;margin-top:20px;">Your castle has been destroyed!</p>
          <p style="font-size:18px;color:#bdc3c7;margin-top:10px;">Time: ${mins}m ${secs}s</p>
          <p style="font-size:16px;color:#7f8c8d;margin-top:40px;">Refresh to try again</p>
          <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}</style>
        `;
      }
      document.body.appendChild(overlay);
      break;
    }
    default:
      break;
  }
});

networkManager.onStatus((status) => {
  if (status === 'disconnected') {
    hud.showInfo('🔴 Multiplayer Disconnected', 3000);
    remotePlayer.group.visible = false;
  }
});

// Engine
const dayNight = new DayNightCycle(scene, sunLight, ambientLight);
const warriorManager = new WarriorManager(ecsWorld, scene, combat, chunkManager);
const gameManager = new GameManager(warriorManager, hud);

// ── Player Spawn ─────────────────────────────────────────────
const spawnX = 0,
  spawnZ = 0;
const spawnHeight = worldGen.getHeightAtWorld(spawnX, spawnZ);
player.spawn(spawnX, spawnZ, spawnHeight);

// Player's castle
const playerCastle = new Castle(
  'player_castle',
  'player',
  spawnX + 10,
  spawnHeight + 1,
  spawnZ + 10,
);
playerCastle.addBuilding(BuildingType.THRONE_ROOM, spawnX + 10, spawnHeight + 1, spawnZ + 10);
playerCastle.addBuilding(BuildingType.BARRACKS, spawnX + 18, spawnHeight + 1, spawnZ + 10);
playerCastle.addBuilding(BuildingType.ARCHERY_RANGE, spawnX + 10, spawnHeight + 1, spawnZ + 18);
playerCastle.addBuilding(BuildingType.WALL, spawnX + 14, spawnHeight + 1, spawnZ + 2);
playerCastle.addBuilding(BuildingType.WALL, spawnX + 6, spawnHeight + 1, spawnZ + 2);
gameManager.setPlayerCastle(playerCastle);
warriorManager.setPlayerCastlePos(spawnX + 10, spawnZ + 10);
minimap.addCastle(spawnX + 10, spawnZ + 10, '#3498db', 'Your Castle');

// Castle build UI & pause menu
const castleBuildUI = new CastleBuildUI(playerCastle, inventory, chunkManager, hud, scene);
const baseBuildView = new BaseBuildView(playerCastle, inventory, chunkManager, hud);
baseBuildView.onBuild((_type, wx, wy, wz) => {
  // Place 3D blocks for the building in the voxel world
  const size = 2;
  for (let dx = -size; dx <= size; dx++) {
    for (let dz = -size; dz <= size; dz++) {
      for (let dy = 0; dy < 4; dy++) {
        const isWall = Math.abs(dx) === size || Math.abs(dz) === size;
        chunkManager.setBlockAtWorld(
          wx + dx,
          wy + dy,
          wz + dz,
          isWall ? BlockType.CASTLE_WALL : dy === 0 ? BlockType.CASTLE_FLOOR : BlockType.AIR,
        );
      }
      chunkManager.setBlockAtWorld(wx + dx, wy + 4, wz + dz, BlockType.CASTLE_WALL);
    }
  }
  // Door
  chunkManager.setBlockAtWorld(wx + size, wy + 1, wz, BlockType.AIR);
  chunkManager.setBlockAtWorld(wx + size, wy + 2, wz, BlockType.AIR);
  chunkManager.setBlockAtWorld(wx, wy + 3, wz, BlockType.TORCH);
});
pauseMenu.setCallbacks(
  () => {
    /* resume */
  },
  () => {
    saveSystem.save(
      player,
      playerHealth,
      inventory,
      playerCastle,
      enemyCastle,
      gameManager.isEnemyCastleDiscovered,
      gameTime,
      dayNight.time,
    );
    hud.showInfo('💾 Saved!', 2000);
  },
  () => {
    const d = saveSystem.load();
    if (d) {
      const a = saveSystem.apply(d, player, inventory);
      playerHealth = a.health;
      dayNight.time = a.dayTime;
      hud.showInfo('💾 Loaded!', 2000);
    }
  },
);

import { Entity, createTeam, createPosition, createHealth } from './ecs';
const playerEntity = new Entity('player-entity');
playerEntity
  .addComponent(createTeam('player'))
  .addComponent(createPosition(spawnX, spawnHeight + 1, spawnZ))
  .addComponent(createHealth(BASE_PLAYER_HP));
ecsWorld.addEntity(playerEntity);

eventBus.on(Events.ENTITY_DAMAGED, (data: any) => {
  if (data.entityId === playerEntity.id) {
    playerHealth = data.remaining;
    hud.updateHealth(playerHealth, BASE_PLAYER_HP);
    hud.flashDamage();
  }
});

// ── Enemy Castle ─────────────────────────────────────────────
const enemyGen = new EnemyCastleGenerator(worldGen, WORLD_SEED);
const { castle: enemyCastle, x: ecX, z: ecZ } = enemyGen.generateCastle();
gameManager.setEnemyCastle(enemyCastle);
warriorManager.setEnemyCastlePos(ecX, ecZ);

let enemyCastlePlaced = false;
eventBus.on(Events.CHUNK_LOADED, () => {
  if (!enemyCastlePlaced) {
    const cx = Math.floor(ecX / CHUNK_SIZE),
      cz = Math.floor(ecZ / CHUNK_SIZE);
    if (chunkManager.getChunk(cx, cz)) {
      enemyGen.placeBlocks(chunkManager, enemyCastle);
      enemyCastlePlaced = true;
    }
  }
});
eventBus.on(Events.ENEMY_CASTLE_DISCOVERED, () => minimap.revealEnemyCastle(ecX, ecZ));

const scoreDashboard = new ScoreDashboard(playerCastle, enemyCastle, ecsWorld, inventory);

// ── Wave / Raid System ──────────────────────────────────────
const waveManager = new WaveManager();
waveManager.onSpawn((type, count) => {
  // Spawn enemy warriors at enemy castle
  for (let i = 0; i < count; i++) {
    const sx = ecX + (Math.random() - 0.5) * 6;
    const sz = ecZ + (Math.random() - 0.5) * 6;
    warriorManager.spawnWarrior(
      type,
      'enemy',
      sx,
      spawnHeight + 1,
      sz,
      enemyCastle.id,
      playerCastle.id,
    );
  }
});
waveManager.onReward((items) => {
  for (const item of items) inventory.addItem(item.itemId, item.count);
  hud.showWaveBanner('⚔️ WAVE CLEARED! Loot received!', '#2ecc71', 4000);
});
eventBus.on(WaveEvents.WAVE_WARNING, (data: any) => {
  hud.showWaveBanner(`⚠️ WAVE ${data.wave} INCOMING!`, '#f1c40f', 5000);
  soundManager.playWarHorn();
});
eventBus.on(WaveEvents.WAVE_START, (data: any) => {
  hud.showWaveBanner(`⚔️ WAVE ${data.wave} — ${data.totalEnemies} enemies!`, '#e74c3c', 3000);
});
eventBus.on(WaveEvents.WAVE_CLEARED, () => {
  soundManager.playWaveCleared();
});

// ── Cave Mob System ─────────────────────────────────────────
const caveMobs = new CaveMobSystem(ecsWorld, scene, combat, chunkManager);
caveMobs.onDrop((drops) => {
  for (const d of drops) inventory.addItem(d.itemId, d.count);
  hud.showInfo('💀 Mob loot collected!', 1500);
});

// ── Drowning Timer ──────────────────────────────────────────
let drowningTimer = 0;

// ── Phase 6 Sound Events ────────────────────────────────────
eventBus.on(Events.SHIELD_BLOCK, () => soundManager.playShieldBlock());
eventBus.on(Events.ENTITY_DIED, (data: any) => {
  if (data.entityId !== playerEntity.id) soundManager.playEnemyDeath();
});
eventBus.on(Events.ARROW_FIRED, () => soundManager.playBowShot());
eventBus.on('player:fall_damage', (data: any) => {
  playerHealth = Math.max(0, playerHealth - data.damage);
  hud.updateHealth(playerHealth, BASE_PLAYER_HP);
  hud.flashDamage();
  soundManager.playFallDamage();
  if (playerHealth <= 0) eventBus.emit(Events.PLAYER_DIED, {});
});

// ── Villager System + Trading ──────────────────────────────
const villagerSystem = new VillagerSystem(scene);
const tradingUI = new TradingUI(inventory);
villagerSystem.setInteractionCallback((villager) => {
  tradingUI.open(villager);
  soundManager.playCraft(); // pleasant interaction ding
});
tradingUI.onRecruit((type) => {
  const typeMap: Record<string, WarriorType> = {
    swordsman: WarriorType.SWORDSMAN,
    archer: WarriorType.ARCHER,
    shield: WarriorType.SHIELD_BEARER,
  };
  const wt = typeMap[type] ?? WarriorType.SWORDSMAN;
  warriorManager.spawnWarrior(
    wt,
    'player',
    player.x + 2,
    player.y,
    player.z + 2,
    playerCastle.id,
    enemyCastle.id,
  );
  hud.showInfo(`⚔️ ${type} warrior recruited!`, 2000);
});

// ── Structure Placement (villages spawn villagers + mounts) ───
const structureGen = new StructureGenerator(WORLD_SEED);
const mountSystem = new MountSystem(scene);

// ── Phase 7 Systems ──────────────────────────────────────
const xpSystem = new XPSystem();
const farmingSystem = new FarmingSystem(chunkManager);
const questSystem = new QuestSystem();
const potionSystem = new PotionSystem();
const ambientSounds = new AmbientSoundSystem();
void new EnchantSystem(); // enchantSystem available for future enchanting UI
let mountSpeedMultiplier = 1;

// XP level up
xpSystem.onLevelUp((stats) => {
  hud.showInfo(`⬆️ Level ${stats.level}! +${stats.bonusHp}HP +${stats.bonusDamage}DMG`, 3000);
  soundManager.playWaveCleared();
});

// Quest completion
questSystem.onComplete((quest) => {
  for (const r of quest.rewards) inventory.addItem(r.itemId, r.count);
  xpSystem.addQuestXP();
  hud.showInfo(`🌟 Quest Complete: ${quest.icon} ${quest.name}!`, 3000);
  soundManager.playWaveCleared();
  questSystem.refresh();
});

// Farming harvest
farmingSystem.onHarvest((items) => {
  for (const it of items) inventory.addItem(it.itemId, it.count);
  eventBus.emit('crop:harvested', {});
  soundManager.playCraft();
});

// Place player castle blocks (near spawn, so chunk should load quickly)
let playerCastlePlaced = false;
eventBus.on(Events.CHUNK_LOADED, () => {
  if (!playerCastlePlaced) {
    const cx = Math.floor((spawnX + 10) / 16),
      cz = Math.floor((spawnZ + 10) / 16);
    if (chunkManager.getChunk(cx, cz)) {
      enemyGen.placeBlocks(chunkManager, playerCastle);
      playerCastlePlaced = true;
    }
  }
  // Discover and place structures near the player
  const newStructures = structureGen.findStructures(
    Math.floor(player.x),
    Math.floor(player.z),
    200,
  );
  for (const loc of newStructures) {
    const groundY = 25; // Approximate terrain height for structures
    structureGen.placeStructure(loc, chunkManager, groundY);
    if (loc.type === 'village') {
      villagerSystem.spawnVillagersAtStructure(loc);
      mountSystem.spawnHorse(loc.x + 12, loc.y + 1, loc.z + 5);
      hud.showInfo('🏘️ Village discovered!', 3000);
    }
    eventBus.emit(Events.STRUCTURE_DISCOVERED, { type: loc.type, x: loc.x, z: loc.z });
  }
});

// ── Events (Sound + Particles + Achievements) ───────────────
eventBus.on(Events.BLOCK_DESTROYED, (data: unknown) => {
  soundManager.playMine();
  const d = data as { x?: number; y?: number; z?: number; color?: number; projectile?: boolean };
  if (d.x !== undefined && d.y !== undefined && d.z !== undefined) {
    if (d.projectile) {
      particles.emitExplosion(d.x, d.y, d.z);
      soundManager.playExplosion();
    } else particles.emitBlockBreak(d.x, d.y, d.z, d.color ?? 0x808080);
  }
});
eventBus.on(Events.BLOCK_PLACED, () => soundManager.playPlace());
eventBus.on(Events.ATTACK_HIT, () => soundManager.playHit());
eventBus.on(Events.ITEM_CRAFTED, () => soundManager.playCraft());
eventBus.on(Events.SHIELD_BLOCK, () => soundManager.playCraft()); // Shield "tink" reuses craft sound
eventBus.on(Events.CRITICAL_HIT, (data: any) => {
  soundManager.playHit();
  if (data.pos || data.targetId) {
    // Extra particle burst for crit
    const target = ecsWorld.getEntity(data.targetId);
    const pos = target?.getComponent<PositionComponent>('position');
    if (pos) particles.emitExplosion(pos.x, pos.y + 1, pos.z);
  }
});
eventBus.on('inventory:full', () => hud.showInfo('❌ Inventory full! Items lost.', 2000));
eventBus.on(Events.PROJECTILE_LAUNCHED, () => soundManager.playCatapult());
eventBus.on(Events.ARROW_FIRED, (data: any) => {
  projectiles.launchArrow(
    data.from.x,
    data.from.y,
    data.from.z,
    data.to.x,
    data.to.y,
    data.to.z,
    data.damage,
    data.team,
  );
  // Optional: add a 'twang' sound if implemented, else playCatapult works as a placeholder
});
eventBus.on(Events.VICTORY, () => soundManager.playVictory());
document.addEventListener('click', () => soundManager.startAmbient(), { once: true });

// ── Host Network Broadcasts (castle + game over) ────────────
eventBus.on(Events.BUILDING_DESTROYED, (data: any) => {
  if (networkManager.isHost && networkManager.isConnected) {
    networkManager.send({
      kind: NetMsgKind.CASTLE_UPDATE,
      castleId: data.castleId,
      buildingId: data.buildingId,
      hp: 0,
      destroyed: true,
    });
  }
});

eventBus.on(Events.ENTITY_DIED, (data: any) => {
  if (networkManager.isHost && networkManager.isConnected && data.entityId) {
    networkManager.send({
      kind: NetMsgKind.WARRIOR_REMOVE,
      entityId: data.entityId,
    });
  }
});

eventBus.on(Events.VICTORY, () => {
  if (networkManager.isHost && networkManager.isConnected) {
    networkManager.send({ kind: NetMsgKind.GAME_OVER, result: 'victory', time: gameTime });
  }
});

eventBus.on(Events.DEFEAT, () => {
  if (networkManager.isHost && networkManager.isConnected) {
    networkManager.send({ kind: NetMsgKind.GAME_OVER, result: 'defeat', time: gameTime });
  }
});

// Achievement toasts
achievements.setToastCallback((text) => hud.showInfo(text, 4000));

// Death screen
deathScreen.setRespawnCallback(() => {
  playerHealth = BASE_PLAYER_HP;
  hunger.hunger = hunger.maxHunger;
  hunger.saturation = 5;
  player.spawn(spawnX, spawnZ, spawnHeight);
});

// ── Tutorial Steps ───────────────────────────────────────────
let tutorialBlocksMined = 0;
let tutorialBlocksPlaced = 0;
let tutorialItemsCrafted = 0;
eventBus.on(Events.BLOCK_DESTROYED, () => tutorialBlocksMined++);
eventBus.on(Events.BLOCK_PLACED, () => tutorialBlocksPlaced++);
eventBus.on(Events.ITEM_CRAFTED, () => tutorialItemsCrafted++);

tutorial.setSteps([
  {
    id: 'look',
    text: 'Click to start, then look around with the mouse',
    icon: '🖱️',
    condition: () => input.isPointerLocked,
  },
  {
    id: 'move',
    text: 'Press WASD to walk around',
    icon: '🚶',
    condition: () => player.x !== spawnX || player.z !== spawnZ,
  },
  {
    id: 'mine',
    text: 'Hold Left Click on a block to mine it',
    icon: '⛏️',
    condition: () => tutorialBlocksMined >= 1,
  },
  {
    id: 'mine_more',
    text: 'Great! Mine 5 more blocks for materials',
    icon: '💎',
    condition: () => tutorialBlocksMined >= 6,
  },
  {
    id: 'craft',
    text: 'Press C to open the crafting menu',
    icon: '⚒️',
    condition: () => tutorialItemsCrafted >= 1,
  },
  {
    id: 'place',
    text: 'Right Click to place a block',
    icon: '🧱',
    condition: () => tutorialBlocksPlaced >= 1,
  },
  {
    id: 'castle',
    text: 'Press B to build castle structures!',
    icon: '🏰',
    condition: () => playerCastle.buildings.length > 5,
  },
]);

// ── Load Save ────────────────────────────────────────────────
let playerHealth = BASE_PLAYER_HP;
let gameTime = 0;
const loaded = saveSystem.load();
if (loaded) {
  const a = saveSystem.apply(loaded, player, inventory);
  playerHealth = a.health;
  dayNight.time = a.dayTime;
  gameTime = a.gameTime;
  hud.showInfo('💾 Save loaded!', 2500);
}

// ── Starter Items (only on fresh game, not loaded save) ──────
if (!loaded) {
  inventory.addItem('wood_pickaxe', 1);
  inventory.addItem('wood_sword', 1);
  inventory.addItem('torch', 16);
  inventory.addItem('bread', 10);
  inventory.addItem('wood_axe', 1);
  inventory.addItem('oak_log', 32);
  inventory.addItem('cobblestone', 32);
  inventory.addItem('iron_ingot', 16);
  inventory.addItem('planks_oak', 32);
  inventory.addItem('stone_brick', 32);
  inventory.addItem('string', 10);
  inventory.addItem('coal', 16);
  inventory.addItem('planks_dark', 16);
}

// Crafting callback
craftingUI.setCraftCallback((recipe) => {
  crafting.craft(recipe, inventory);
  hud.showInfo(`⚒️ ${recipe.name}`);
});

// ── Block Interaction & Combat ───────────────────────────────────
const damageNumbers = new DamageNumbers(camera);
const raycaster = new THREE.Raycaster();
raycaster.far = 6;
let miningTarget: { x: number; y: number; z: number; block: BlockType; progress: number } | null =
  null;
let clickCooldown = 0;

function checkPlayerMeleeAttack(): boolean {
  if (clickCooldown > 0) return false;

  const sel = inventory.getSelectedItem();
  const toolDef = sel ? getItemDef(sel.itemId) : null;
  const damage = toolDef?.damage ?? 5; // Base punch damage

  let hitEntity: import('./ecs').Entity | null = null;
  let minPos: PositionComponent | null = null;

  const entities = ecsWorld.query('position', 'health', 'team');
  const attackRange = 3.5;

  const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  const pVec = new THREE.Vector3(player.x, player.y + 1.5, player.z); // from eye level

  for (const entity of entities) {
    const team = entity.getComponent<TeamComponent>('team');
    if (!team || team.team === 'player' || team.team === 'neutral') continue;

    const health = entity.getComponent<import('./ecs/Component').HealthComponent>('health');
    if (!health || health.isDead) continue;

    const pos = entity.getComponent<PositionComponent>('position');
    if (!pos) continue;

    const eVec = new THREE.Vector3(pos.x, pos.y + 1, pos.z); // target center
    const dist = pVec.distanceTo(eVec);

    if (dist <= attackRange) {
      const dirToEnemy = eVec.clone().sub(pVec).normalize();
      const dot = camDir.dot(dirToEnemy);
      if (dot > 0.8) {
        // Approx 36 degree cone
        hitEntity = entity;
        minPos = pos;
        break;
      }
    }
  }

  if (hitEntity && minPos) {
    const health = hitEntity.getComponent<import('./ecs/Component').HealthComponent>('health')!;
    const actualDmg = combat.calculateDamage(damage, health.armor);
    combat.applyDamage(hitEntity, health, actualDmg);

    soundManager.playHit();
    particles.emitBlockBreak(minPos.x, minPos.y + 1, minPos.z, 0xcc0000);

    if (sel && toolDef?.durability) {
      if (inventory.damageItem(inventory.selectedHotbarSlot, 1)) {
        hud.showInfo(`💥 ${toolDef.name} broke!`, 2000);
      }
    }

    clickCooldown = 0.5;
    return true;
  }
  return false;
}

function updateBlockInteraction(dt: number): void {
  if (!input.isPointerLocked || craftingUI.isVisible || pauseMenu.isVisible) {
    blockHighlight.hide();
    return;
  }
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const meshes = scene.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);
  const intersects = raycaster.intersectObjects(meshes);
  if (intersects.length === 0) {
    blockHighlight.hide();
    miningTarget = null;
    return;
  }
  const hit = intersects[0];
  const normal = hit.face?.normal;
  if (!normal || !hit.point) {
    blockHighlight.hide();
    return;
  }
  const bp = hit.point.clone().sub(normal.clone().multiplyScalar(0.5));
  const bx = Math.floor(bp.x),
    by = Math.floor(bp.y),
    bz = Math.floor(bp.z);
  const block = chunkManager.getBlockAtWorld(bx, by, bz) as BlockType;
  if (block === BlockType.AIR) {
    blockHighlight.hide();
    miningTarget = null;
    hud.updateCrosshair('default');
    return;
  }
  blockHighlight.setPosition(bx, by, bz);

  // WS11: Update crosshair based on context
  const nearestCombatEnemy = combat.findNearestEnemy(playerEntity, 4.0);
  if (nearestCombatEnemy) {
    hud.updateCrosshair('attack');
  } else if (block === BlockType.ANVIL || block === BlockType.CHEST) {
    hud.updateCrosshair('interact');
  } else {
    hud.updateCrosshair('target');
  }

  // Mining / Attacking
  if (input.isMouseDown(0)) {
    if (castleBuildUI.isPlacing) {
      castleBuildUI.placeBuilding();
      clickCooldown = 0.3;
      return;
    }

    // Check melee attack first
    if (checkPlayerMeleeAttack()) {
      miningTarget = null;
      blockHighlight.hideMiningProgress();
      return;
    }

    if (!miningTarget || miningTarget.x !== bx || miningTarget.y !== by || miningTarget.z !== bz) {
      miningTarget = { x: bx, y: by, z: bz, block, progress: 0 };
    }
    const props = getBlockProperties(block);
    if (props.hardness <= 0) {
      miningTarget = null;
      blockHighlight.hideMiningProgress();
    } else {
      const sel = inventory.getSelectedItem();
      const toolDef = sel ? getItemDef(sel.itemId) : null;
      const speed = toolDef?.miningSpeed ?? 1.0;
      miningTarget.progress += (dt * speed) / props.hardness;
      blockHighlight.setMiningProgress(miningTarget.progress);
      if (miningTarget.progress >= 1.0) {
        chunkManager.setBlockAtWorld(bx, by, bz, BlockType.AIR);
        if (props.dropItem) inventory.addItem(props.dropItem, 1);
        eventBus.emit(Events.BLOCK_DESTROYED, { x: bx, y: by, z: bz, color: props.color });
        if (networkManager.isConnected)
          networkManager.send({
            kind: NetMsgKind.BLOCK_CHANGE,
            x: bx,
            y: by,
            z: bz,
            blockType: BlockType.AIR,
          });
        hud.showInfo(`+1 ${props.dropItem ?? props.name}`, 1500);

        // Damage tool
        if (sel && toolDef && toolDef.durability) {
          const broke = inventory.damageItem(inventory.selectedHotbarSlot, 1);
          if (broke) {
            hud.showInfo(`💥 ${toolDef.name} broke!`, 2000);
            eventBus.emit(Events.BLOCK_DESTROYED, { x: bx, y: by, z: bz, color: 0x888888 }); // visual poof
          }
        }
        // Torch removal
        if (block === BlockType.TORCH) torchLights.removeTorch(bx, by, bz);
        miningTarget = null;
        blockHighlight.hideMiningProgress();
      }
    }
  } else {
    if (miningTarget) {
      miningTarget = null;
      blockHighlight.hideMiningProgress();
    }
  }
  // Placing / Interacting
  if (input.isMouseDown(2) && clickCooldown <= 0) {
    // Check for interaction first
    if (block === BlockType.ANVIL) {
      if (!craftingUI.isVisible) {
        craftingUI.openAtStation(CraftingStation.ANVIL);
        document.exitPointerLock();
      }
      clickCooldown = 0.5;
      return;
    }

    const sel = inventory.getSelectedItem();
    if (sel) {
      const def = getItemDef(sel.itemId);
      if (def?.placesBlock) {
        const pp = hit.point.clone().add(normal.clone().multiplyScalar(0.5));
        const px = Math.floor(pp.x),
          py = Math.floor(pp.y),
          pz = Math.floor(pp.z);
        const dx = px - Math.floor(player.x),
          dz = pz - Math.floor(player.z),
          dy = py - Math.floor(player.y);
        if (!(Math.abs(dx) < 1 && Math.abs(dz) < 1 && dy >= 0 && dy < 2)) {
          chunkManager.setBlockAtWorld(px, py, pz, def.placesBlock);
          inventory.removeItem(sel.itemId, 1);
          soundManager.playPlace();
          eventBus.emit(Events.BLOCK_PLACED, { x: px, y: py, z: pz });
          if (networkManager.isConnected)
            networkManager.send({
              kind: NetMsgKind.BLOCK_CHANGE,
              x: px,
              y: py,
              z: pz,
              blockType: def.placesBlock,
            });
          // Add torch light
          if (def.placesBlock === BlockType.TORCH) torchLights.addTorch(px, py, pz);
          clickCooldown = 0.25;
        }
      }
    }
  }
}

// ── Fall Damage & Death ──────────────────────────────────────
let lastGroundedY = spawnHeight + 2;
let lastPlayerX = player.x,
  lastPlayerZ = player.z;

function checkFallDamage(): void {
  if (player.isGrounded) {
    const fall = lastGroundedY - player.y;
    if (fall > 4) {
      const dmg = Math.floor((fall - 3) * 5);
      playerHealth = Math.max(0, playerHealth - dmg);
      hud.showInfo(`Fall damage: -${dmg}`, 2000);
      if (playerHealth <= 0) die('Fall damage');
    }
    lastGroundedY = player.y;
  } else if (player.y > lastGroundedY) lastGroundedY = player.y;
}

function die(cause: string): void {
  deathScreen.show({
    blocksMined: achievements.stats.blocksMined,
    enemiesKilled: achievements.stats.enemiesKilled,
    timePlayed: achievements.stats.timePlayed,
    cause,
  });
}

// Starving damage
eventBus.on(Events.PLAYER_STARVING, () => {
  playerHealth = Math.max(0, playerHealth - 1);
  if (playerHealth <= 0) die('Starvation');
});

// ── Keyboard ─────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  const num = parseInt(e.key);
  if (num >= 1 && num <= 9) inventory.selectHotbar(num - 1);
  if (key === 'c') {
    craftingUI.toggle();
    if (craftingUI.isVisible) document.exitPointerLock();
  }
  if (key === 'e' && !craftingUI.isVisible) {
    const avail = crafting.getCraftableRecipes(CraftingStation.HAND, inventory);
    if (avail.length > 0) {
      crafting.craft(avail[0], inventory);
      hud.showInfo(`⚒️ ${avail[0].name}`);
    }
  }
  // Eat food with F — reads nutrition from item defs
  if (key === 'f') {
    const foodItems = [
      'cooked_meat',
      'bread',
      'golden_apple',
      'apple',
      'carrot',
      'potato',
      'pumpkin',
    ];
    for (const food of foodItems) {
      if (inventory.countItem(food) > 0) {
        const def = getItemDef(food);
        const restore = def?.hungerRestore ?? 4;
        const sat = def?.saturationRestore ?? 2;
        if (hunger.eat(restore, sat)) {
          inventory.removeItem(food, 1);
          hud.showInfo(`🍖 Ate ${def?.name ?? food}`, 1500);
          break;
        }
      }
    }
  }
  if (key === 'escape') {
    if (tradingUI.isVisible) tradingUI.hide();
    else if (inventoryUI.isVisible) inventoryUI.hide();
    else if (craftingUI.isVisible) craftingUI.hide();
    else if (baseBuildView.isVisible) baseBuildView.close();
    else if (castleBuildUI.isVisible) castleBuildUI.cancel();
    else if (scoreDashboard.isVisible) scoreDashboard.hide();
    else if (deathScreen.isVisible) {
      /* can't escape death */
    } else pauseMenu.toggle();
  }
  if (key === 'b' && !craftingUI.isVisible && !pauseMenu.isVisible && !inventoryUI.isVisible) {
    if (baseBuildView.isVisible) baseBuildView.close();
    else baseBuildView.open();
  }
  if (key === 'n' && !craftingUI.isVisible && !pauseMenu.isVisible && !inventoryUI.isVisible)
    multiplayerMenu.toggle();
  if (key === 'i' && !craftingUI.isVisible && !pauseMenu.isVisible) inventoryUI.toggle();
  if (key === 'f5') {
    e.preventDefault();
    const ok = saveSystem.save(
      player,
      playerHealth,
      inventory,
      playerCastle,
      enemyCastle,
      gameManager.isEnemyCastleDiscovered,
      gameTime,
      dayNight.time,
    );
    hud.showInfo(ok ? '💾 Saved!' : '❌ Failed', 2000);
  }
  if (key === 'f9') {
    e.preventDefault();
    const d = saveSystem.load();
    if (d) {
      const a = saveSystem.apply(d, player, inventory);
      playerHealth = a.health;
      dayNight.time = a.dayTime;
      hud.showInfo('💾 Loaded!', 2000);
    }
  }
  if (key === 'm') {
    soundManager.toggle();
    hud.showInfo(soundManager.isEnabled ? '🔊 ON' : '🔇 OFF', 1500);
  }
  if (key === ' ' && player.isGrounded) soundManager.playJump();
  if (key === 'e') {
    // Trading interaction
    if (tradingUI.isVisible) {
      tradingUI.hide();
    } else if (!craftingUI.isVisible && !pauseMenu.isVisible && !inventoryUI.isVisible) {
      villagerSystem.tryInteract(player.x, player.y, player.z);
    }
  }
  if (key === 'r') {
    // Mount / dismount
    if (mountSystem.isMounted) {
      mountSystem.dismount(player.x, player.y, player.z);
      mountSpeedMultiplier = 1;
      hud.showInfo('Dismounted', 1500);
    } else {
      const result = mountSystem.tryMount(player.x, player.y, player.z);
      if (result) {
        mountSpeedMultiplier = result.speed;
        hud.showInfo(`🐎 Mounted ${result.name}! (${result.speed}x speed)`, 2000);
      }
    }
  }
  if (key === 'tab') {
    e.preventDefault();
    scoreDashboard.toggle();
  }
});

// ── Game Loop ────────────────────────────────────────────────
let lastTime = performance.now();
let frameCount = 0,
  fpsTime = 0,
  fps = 0;
let autoSaveTimer = 0;

function gameLoop(): void {
  requestAnimationFrame(gameLoop);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  gameTime += dt;
  frameCount++;
  fpsTime += dt;
  if (fpsTime >= 1.0) {
    fps = frameCount;
    frameCount = 0;
    fpsTime = 0;
  }
  clickCooldown -= dt;

  const paused =
    pauseMenu.isVisible ||
    deathScreen.isVisible ||
    scoreDashboard.isVisible ||
    inventoryUI.isVisible;

  if (!craftingUI.isVisible && !paused) {
    player.update(dt);
    checkFallDamage();
    hunger.update(dt, input.isKeyDown('shift'), input.isMouseDown(0));

    // Health regen when well-fed
    if (hunger.canHeal && playerHealth < BASE_PLAYER_HP) {
      playerHealth = Math.min(BASE_PLAYER_HP, playerHealth + dt * 0.5);
    }

    // Sync player ECS entity
    const pPos =
      playerEntity.getComponent<import('./ecs/Component').PositionComponent>('position')!;
    pPos.x = player.x;
    pPos.y = player.y + 1.0;
    pPos.z = player.z;
    const pHealth = playerEntity.getComponent<import('./ecs/Component').HealthComponent>('health')!;
    pHealth.current = playerHealth;
  }

  if (!paused) {
    chunkManager.update(player.x, player.z);
    dayNight.update(dt);
    updateBlockInteraction(dt);
    particles.update(dt);
    torchLights.update(dt, player.x, player.z);

    // WS5: Update vegetation wind time on all chunk meshes
    for (const mesh of chunkManager.activeMeshes) {
      if (mesh.userData.windTimeUniform) {
        mesh.userData.windTimeUniform.value = gameTime;
      }
    }

    // WS15: Animate lava texture every frame
    textureAtlas.updateAnimatedTiles(gameTime);

    damageNumbers.update(dt);
    remotePlayer.update(dt);
    weather.update(dt, player.x, player.y, player.z);

    // Host runs full game logic; guest only renders
    if (!isGuest()) {
      combat.update(dt);
      projectiles.update(dt, ecsWorld, () => new THREE.Vector3(player.x, player.y + 1, player.z));
      warriorManager.update(dt);
      gameManager.update(dt, player.x, player.z);
      ecsWorld.update(dt);
    }

    // Network sync
    if (networkManager.isConnected) {
      const nowMs = performance.now();

      // Both: broadcast player position
      if (nowMs - lastNetSendTime >= NETWORK_TICK_RATE) {
        lastNetSendTime = nowMs;
        networkManager.send({
          kind: NetMsgKind.PLAYER_MOVE,
          x: player.x,
          y: player.y,
          z: player.z,
          yaw: player.yaw,
          pitch: 0,
          t: nowMs,
        });
      }

      // Host: broadcast warrior state to guest
      if (networkManager.isHost && nowMs - lastWarriorSyncTime >= WARRIOR_SYNC_RATE) {
        lastWarriorSyncTime = nowMs;
        const warriorState = warriorManager.getAllWarriorState() as WarriorNetState[];
        networkManager.send({ kind: NetMsgKind.WARRIOR_UPDATE, warriors: warriorState });
      }
    }

    // Sky
    sky.update(dayNight.time, player.x, player.z);

    // Height-based fog density (WS6): denser in valleys, thinner on mountains
    if (scene.fog instanceof THREE.FogExp2) {
      const baseHeight = 20; // SEA_LEVEL
      const heightFactor = Math.max(0, 1.0 - (player.y - baseHeight) / 60); // 0 at high altitudes, 1 at sea level
      const nightBoost = dayNight.isNight ? 1.5 : 1.0;
      scene.fog.density = (0.008 + heightFactor * 0.008) * nightBoost;
    }

    // WS12: Underwater detection
    const camBlock = chunkManager.getBlockAtWorld(
      Math.floor(player.x),
      Math.floor(player.y + 1.6),
      Math.floor(player.z),
    );
    const isUnderwater = camBlock === BlockType.WATER;
    hud.setUnderwaterOverlay(isUnderwater);
    if (isUnderwater && scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = 0.04; // Much denser underwater
    }

    // Structure generation near player
    const newStructs = structGen.findStructures(Math.floor(player.x), Math.floor(player.z), 200);
    for (const s of newStructs) {
      const gy = worldGen.getHeightAtWorld(s.x, s.z);
      structGen.placeStructure(s, chunkManager, gy);
      minimap.addCastle(s.x, s.z, '#9b59b6', s.type);
    }

    // Castle build ghost
    if (castleBuildUI.isPlacing)
      castleBuildUI.updateGhost(player.x, player.y, player.z, player.yaw);

    // Achievements — track movement
    const dx = player.x - lastPlayerX,
      dz = player.z - lastPlayerZ;
    achievements.updateFrame(dt, dx, dz);
    lastPlayerX = player.x;
    lastPlayerZ = player.z;
  }

  // Tutorial
  tutorial.update();

  // Sun follows player
  sunLight.position.x = player.x + 100;
  sunLight.position.z = player.z + 50;
  sunLight.target.position.set(player.x, 0, player.z);
  sunLight.target.updateMatrixWorld();

  // HUD
  hud.updateHealth(playerHealth, BASE_PLAYER_HP);
  const hotbar = inventory.getHotbar().map((s) => {
    if (!s) return null;
    const d = getItemDef(s.itemId);
    return d
      ? {
          name: d.name,
          count: s.count,
          itemId: s.itemId,
          durability: s.durability,
          maxDurability: d.durability,
        }
      : null;
  });
  hud.updateHotbar(hotbar, inventory.selectedHotbarSlot);
  const biome = worldGen.getBiome(Math.floor(player.x), Math.floor(player.z));
  const biomeLabel: Record<string, string> = {
    forest: '🌲 Forest',
    plains: '🌾 Plains',
    desert: '🏜️ Desert',
    tundra: '❄️ Tundra',
    swamp: '🌿 Swamp',
    mountain: '⛰️ Mountain',
  };
  hud.updateDebug(
    fps,
    player.x,
    player.y,
    player.z,
    chunkManager.loadedChunkCount,
    biomeLabel[biome] ?? biome,
    dayNight.getTimeString(),
    warriorManager.warriorCount,
  );
  hud.updateHunger(hunger.hunger, hunger.maxHunger);
  baseBuildView.update();

  // Villager update + interaction prompt
  villagerSystem.update(dt, player.x, player.y, player.z);
  const nearVillager = villagerSystem.getNearestInRange(player.x, player.y, player.z);
  if (nearVillager && !tradingUI.isVisible) {
    hud.showInfo(`Press E to trade with ${nearVillager.name}`, 100);
  }

  // Mount prompt
  const nearMount = mountSystem.getNearestInRange(player.x, player.y, player.z);
  if (nearMount && !mountSystem.isMounted) {
    hud.showInfo(`Press R to mount ${nearMount.name}`, 100);
  }
  if (mountSystem.isMounted) {
    hud.showInfo(`🐎 Mounted! ${mountSpeedMultiplier}x speed (R to dismount)`, 100);
  }

  // Phase 7 system updates
  farmingSystem.update(dt);
  potionSystem.update(dt);
  ambientSounds.update(dt, 'plains', player.y);

  // Wave system
  waveManager.update(dt);
  const ws = waveManager.getState();
  hud.updateWave(ws.waveNumber, ws.phase, ws.timer, ws.enemiesAlive);

  // Cave mobs
  caveMobs.update(dt, player.x, player.y, player.z);

  // Tower auto-shoot
  warriorManager.updateTowerAutoShoot(playerCastle, dt);

  // Environmental hazards
  // Lava damage (4 HP/sec)
  const standingBlock = chunkManager.getBlockAtWorld(
    Math.floor(player.x),
    Math.floor(player.y) - 1,
    Math.floor(player.z),
  );
  if (standingBlock === BlockType.LAVA) {
    playerHealth = Math.max(0, playerHealth - 4 * dt);
    hud.updateHealth(Math.ceil(playerHealth), BASE_PLAYER_HP);
    hud.flashDamage();
    if (Math.random() < dt * 2) soundManager.playLavaBurn();
    if (playerHealth <= 0) eventBus.emit(Events.PLAYER_DIED, {});
  }

  // Drowning (damage after 10s submerged)
  const headBlock = chunkManager.getBlockAtWorld(
    Math.floor(player.x),
    Math.floor(player.y + 1.6),
    Math.floor(player.z),
  );
  if (headBlock === BlockType.WATER) {
    drowningTimer += dt;
    hud.setUnderwaterOverlay(true);
    if (drowningTimer > 10) {
      playerHealth = Math.max(0, playerHealth - 2 * dt);
      hud.updateHealth(Math.ceil(playerHealth), BASE_PLAYER_HP);
      hud.flashDamage();
      if (playerHealth <= 0) eventBus.emit(Events.PLAYER_DIED, {});
    }
  } else {
    drowningTimer = 0;
    hud.setUnderwaterOverlay(false);
  }

  // Minimap
  const warriors = ecsWorld.queryByTag('warrior');
  minimap.setPlayer(player.x, player.z, player.yaw);
  minimap.setEntities(
    warriors.map((w) => {
      const pos = w.getComponent<PositionComponent>('position')!;
      const team = w.getComponent<TeamComponent>('team')!;
      return { x: pos.x, z: pos.z, color: team.team === 'player' ? '#3498db' : '#e74c3c', size: 2 };
    }),
  );
  minimap.update();

  // Auto-save
  autoSaveTimer += dt;
  if (autoSaveTimer >= 60) {
    autoSaveTimer = 0;
    saveSystem.save(
      player,
      playerHealth,
      inventory,
      playerCastle,
      enemyCastle,
      gameManager.isEnemyCastleDiscovered,
      gameTime,
      dayNight.time,
    );
  }

  // Bloom boost at night for atmospheric glow
  postProcessing.setBloomStrength(dayNight.isNight ? 0.5 : 0.3);

  postProcessing.render();
  input.resetDeltas();
}

// ── Resize ───────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  postProcessing.resize(window.innerWidth, window.innerHeight);
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ── Start ────────────────────────────────────────────────────
hud.showStartScreen();
gameLoop();

// eslint-disable-next-line no-console
console.log('🏰 Mattis Abenteuer — Complete Engine');
// eslint-disable-next-line no-console
console.log(
  `   Seed: ${WORLD_SEED} | Enemy: (${ecX},${ecZ}) ~${Math.sqrt(ecX * ecX + ecZ * ecZ).toFixed(0)}blk`,
);
// eslint-disable-next-line no-console
console.log(`   Recipes: ${crafting.getAllRecipes().length} | Biomes: 6 | Achievements: 16`);
// eslint-disable-next-line no-console
console.log(
  `   WASD Move|C Craft|B Build|F Eat|N Multiplayer|F5 Save|F9 Load|M Sound|Tab Skip Tutorial`,
);
