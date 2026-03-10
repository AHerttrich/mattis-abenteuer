/**
 * SaveSystem — Serializes/deserializes game state to localStorage.
 */

import type { Inventory } from '../crafting/Inventory';
import type { PlayerController } from '../player/PlayerController';
import type { Castle, CastleBuilding } from '../castle/Castle';

const SAVE_KEY = 'mattis_abenteuer_save';

interface SaveData {
  version: 2;
  timestamp: number;
  player: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    health: number;
  };
  inventory: {
    slots: ({ itemId: string; count: number; durability?: number } | null)[];
    selectedHotbar: number;
  };
  playerCastle: {
    x: number;
    y: number;
    z: number;
    buildings: SerializedBuilding[];
  } | null;
  enemyCastle: {
    x: number;
    y: number;
    z: number;
    buildings: SerializedBuilding[];
    discovered: boolean;
  } | null;
  gameTime: number;
  dayTime: number;
}

interface SerializedBuilding {
  id: string;
  type: string;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
}

export class SaveSystem {
  /** Save current game state. */
  save(
    player: PlayerController,
    health: number,
    inventory: Inventory,
    playerCastle: Castle | null,
    enemyCastle: Castle | null,
    enemyDiscovered: boolean,
    gameTime: number,
    dayTime: number,
  ): boolean {
    try {
      const data: SaveData = {
        version: 2,
        timestamp: Date.now(),
        player: {
          x: player.x,
          y: player.y,
          z: player.z,
          yaw: player.yaw,
          pitch: player.pitch,
          health,
        },
        inventory: {
          slots: inventory.slots.map((s) =>
            s ? { itemId: s.itemId, count: s.count, durability: s.durability } : null,
          ),
          selectedHotbar: inventory.selectedHotbarSlot,
        },
        playerCastle: playerCastle
          ? {
              x: playerCastle.x,
              y: playerCastle.y,
              z: playerCastle.z,
              buildings: this.serializeBuildings(playerCastle.buildings),
            }
          : null,
        enemyCastle: enemyCastle
          ? {
              x: enemyCastle.x,
              y: enemyCastle.y,
              z: enemyCastle.z,
              buildings: this.serializeBuildings(enemyCastle.buildings),
              discovered: enemyDiscovered,
            }
          : null,
        gameTime,
        dayTime,
      };

      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  /** Load game state. Returns null if no save or invalid. */
  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== 2) return null;
      return data;
    } catch {
      return null;
    }
  }

  /** Apply loaded save data to game systems. */
  apply(
    data: SaveData,
    player: PlayerController,
    inventory: Inventory,
  ): { health: number; gameTime: number; dayTime: number } {
    // Player pos
    player.x = data.player.x;
    player.y = data.player.y;
    player.z = data.player.z;
    player.yaw = data.player.yaw;
    player.pitch = data.player.pitch;

    // Inventory
    inventory.clear();
    for (let i = 0; i < data.inventory.slots.length && i < inventory.size; i++) {
      const slot = data.inventory.slots[i];
      if (slot) {
        inventory.slots[i] = {
          itemId: slot.itemId,
          count: slot.count,
          durability: slot.durability,
        };
      }
    }
    inventory.selectHotbar(data.inventory.selectedHotbar);

    return {
      health: data.player.health,
      gameTime: data.gameTime,
      dayTime: data.dayTime,
    };
  }

  /** Check if a save exists. */
  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  /** Delete save data. */
  deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  /** Get save info without full load. */
  getSaveInfo(): { timestamp: number; formatted: string } | null {
    const data = this.load();
    if (!data) return null;
    const date = new Date(data.timestamp);
    return {
      timestamp: data.timestamp,
      formatted: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
    };
  }

  private serializeBuildings(buildings: CastleBuilding[]): SerializedBuilding[] {
    return buildings.map((b) => ({
      id: b.id,
      type: b.type,
      x: b.x,
      y: b.y,
      z: b.z,
      hp: b.hp,
      maxHp: b.maxHp,
    }));
  }
}
