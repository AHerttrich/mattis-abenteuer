# Architecture Document — Mattis Abenteuer

## Design Philosophy

| Principle | Description |
|---|---|
| **Component-based (ECS)** | Entities are composed of data components; systems process them independently |
| **Chunk-based world** | World divided into fixed-size chunks for efficient rendering and memory |
| **Event-driven** | Systems communicate via an event bus — loose coupling, easy extension |
| **Data-oriented** | Game state is plain data; logic lives in systems, not in entity classes |
| **Progressive loading** | Only load/render chunks near the player; unload distant ones |

## System Architecture

```mermaid
graph TB
    subgraph "Game Loop"
        GL[Game Loop<br/>requestAnimationFrame]
    end

    subgraph "Core Engine"
        R[Renderer<br/>Three.js WebGL]
        P[Physics Engine<br/>Collision & Gravity]
        I[Input Manager<br/>Keyboard & Mouse]
        A[Audio Manager<br/>Web Audio API]
    end

    subgraph "World Systems"
        WG[World Generator<br/>Procedural Terrain]
        CM[Chunk Manager<br/>Load/Unload Chunks]
        BM[Block Manager<br/>Place/Destroy Blocks]
    end

    subgraph "Gameplay Systems"
        CS[Crafting System<br/>Recipes & Workbench]
        INV[Inventory System<br/>Items & Stacks]
        COM[Combat System<br/>Damage & Weapons]
        HP[Health System<br/>HP & Status Effects]
    end

    subgraph "Progression Systems"
        XP[XP System<br/>Levels & Stat Bonuses]
        QS[Quest System<br/>Dynamic Objectives]
        ACH[Achievement System<br/>Milestones & Toasts]
    end

    subgraph "RPG Systems"
        FARM[Farming System<br/>Plant & Harvest]
        ENCH[Enchant System<br/>Weapon Upgrades]
        POT[Potion System<br/>Brewing & Effects]
    end

    subgraph "NPC Systems"
        VS[Villager System<br/>Trade & Recruit]
        MT[Mount System<br/>Horses & Speed]
        AMB[Ambient Sounds<br/>Biome Audio]
    end

    subgraph "Castle Systems"
        CB[Castle Builder<br/>Structure Placement]
        WS[Warrior Spawner<br/>Building → Troops]
        SG[Siege Engine<br/>Catapults & Projectiles]
    end

    subgraph "AI Systems"
        PF[Pathfinder<br/>A* Navigation]
        EA[Enemy AI<br/>Guards & Defenders]
        AA[Army AI<br/>March & Attack]
    end

    subgraph "UI Layer"
        HUD[HUD Overlay<br/>Health, Inventory]
        MENU[Menu System<br/>Pause, Settings]
        CUI[Crafting UI<br/>Recipe Browser]
    end

    GL --> R
    GL --> P
    GL --> I
    GL --> WG
    GL --> CS
    GL --> COM
    GL --> CB
    GL --> PF
    GL --> HUD

    CM --> R
    BM --> CM
    WG --> CM
    I --> COM
    INV --> CS
    CB --> WS
    WS --> AA
    AA --> PF
    EA --> PF
    SG --> BM
    COM --> XP
    QS --> INV
    VS --> INV
    FARM --> INV
    MT --> I
```

## Technology Choices

| Layer | Choice | Rationale |
|---|---|---|
| **Language** | TypeScript | Type safety, IDE support, learning-friendly for a father-son project |
| **3D Engine** | Three.js | Most mature WebGL library, huge community, great docs |
| **Build Tool** | Vite | Fast HMR, native ES modules, simple config |
| **Testing** | Vitest | Native Vite integration, fast, Jest-compatible API |
| **Linting** | ESLint + Prettier | Standard TS tooling, auto-format on save |
| **Architecture** | ECS Pattern | Scalable for game entities, decoupled systems, easy to test |
| **World Gen** | Simplex Noise | Fast, good terrain variety, well-documented algorithm |

### Why Three.js over Alternatives?

| Alternative | Reason for Rejection |
|---|---|
| Babylon.js | Heavier, more complex API — overkill for a voxel game |
| PlayCanvas | Editor-centric, less control over raw rendering |
| Unity WebGL | Huge bundle size, C# not TypeScript |
| Custom WebGL | Too low-level, slow to develop |

## Data Architecture

### Block Types

```typescript
enum BlockType {
  AIR = 0,
  DIRT = 1,
  GRASS = 2,
  STONE = 3,
  WOOD_OAK = 4,
  WOOD_BIRCH = 5,
  IRON_ORE = 6,
  GOLD_ORE = 7,
  CRYSTAL = 8,
  SAND = 9,
  WATER = 10,
  COBBLESTONE = 11,
  BRICK = 12,
  // ... extends to 255 block types
}
```

### Chunk Data

```typescript
interface Chunk {
  x: number;          // chunk coord
  z: number;          // chunk coord
  blocks: Uint8Array; // CHUNK_SIZE³ flat array
  mesh: THREE.Mesh;   // rendered geometry
  dirty: boolean;     // needs re-meshing
}
```

### Data Flow

```mermaid
flowchart LR
    WorldGen["World Generator<br/>(Simplex Noise)"] --> ChunkData["Chunk Data<br/>(Uint8Array)"]
    ChunkData --> Mesher["Greedy Mesher<br/>(Geometry)"]
    Mesher --> Renderer["Three.js<br/>(WebGL)"]
    PlayerInput["Player Input"] --> BlockEdit["Block Edit<br/>(Place/Destroy)"]
    BlockEdit --> ChunkData
    ChunkData --> SaveSystem["Save System<br/>(IndexedDB)"]
```

### Data Stores

| Store | Technology | Purpose |
|---|---|---|
| **Chunk data** | In-memory `Map<string, Chunk>` | Active world state |
| **Save files** | IndexedDB | Persistent game saves |
| **Assets** | Static files (`/public/`) | Textures, sounds, models |
| **Config** | `.env` + runtime | Game settings, debug flags |

## Networking Architecture

**Design**: Host-authoritative co-op over WebRTC (PeerJS). The host runs all game logic; the guest receives state updates and sends player input.

```mermaid
graph LR
    subgraph "Host PC"
        H_Game["Game Logic<br/>(warriors, AI, combat)"]
        H_Render["Rendering"]
    end
    subgraph "Guest PC"
        G_Render["Rendering Only"]
    end
    H_Game -->|"WARRIOR_UPDATE<br/>every 200ms"| G_Render
    H_Game -->|"WARRIOR_REMOVE<br/>on death"| G_Render
    H_Game -->|"CASTLE_UPDATE<br/>on damage"| G_Render
    H_Game -->|"GAME_OVER<br/>victory/defeat"| G_Render
    H_Render <-->|"PLAYER_MOVE<br/>BLOCK_CHANGE"| G_Render
```

| Component | Technology | Notes |
|---|---|---|
| **Signaling** | PeerJS cloud (`0.peerjs.com`) | Both PCs need internet for initial handshake |
| **Data channel** | WebRTC P2P | Game data flows directly between PCs |
| **Connection** | Room codes | Host generates code, guest enters it |
| **Tick rate** | 100ms player sync, 200ms warrior sync | Positions are lerped on guest |

## Security Architecture

| Concern | Approach |
|---|---|
| **Save integrity** | JSON schema validation on load |
| **Dependencies** | Dependabot + `npm audit` in CI |
| **Secrets** | No secrets needed — purely client-side |
| **Code quality** | ESLint security rules, no `eval()` |
| **Multiplayer** | WebRTC P2P — no server-side auth; trust model is LAN/friend-only |

## Deployment Topology

```
mattis-abenteuer/
├── Dev Server              Vite dev server (0.0.0.0:3001, LAN accessible)
├── Build Output            Static files in dist/
├── CI/CD                   GitHub Actions (lint + test + build)
└── Multiplayer             PeerJS WebRTC P2P (host generates room code)
```

No cloud deployment — the game runs entirely in the browser.
LAN multiplayer: Player 2 opens `http://<host-ip>:3001` and joins via room code.
Future consideration: Itch.io or GitHub Pages for distribution.
