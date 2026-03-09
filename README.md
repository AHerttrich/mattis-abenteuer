# Mattis Abenteuer 🏰⚔️

[![CI](https://github.com/AHerttrich/mattis-abenteuer/actions/workflows/ci.yml/badge.svg)](https://github.com/AHerttrich/mattis-abenteuer/actions/workflows/ci.yml)

> A 3D voxel survival-crafting castle warfare game — gather resources, craft weapons, build your fortress, and conquer the enemy castle.

## 🎮 Features

| Feature | Description |
|---|---|
| **Voxel World** | Procedurally generated 3D world with 6 diverse biomes and 80+ block types |
| **Survival & Crafting** | 50+ items, 30+ recipes, hunger system, tools & weapons |
| **Castle Building** | Build your fortress — structures determine which warriors spawn |
| **Base Building View** | 2D map overview of your base with drag-to-rearrange, demolish, tooltips |
| **Army Management** | Warriors auto-spawn, march, and siege the enemy castle |
| **Castle Warfare** | Siege with catapults, boulders, and full army AI |
| **Villages & NPCs** | Discover villages with villagers — trade, recruit warriors, buy rare items |
| **Farming** | Plant wheat/carrot/potato/pumpkin, grow crops, harvest food |
| **XP & Leveling** | Gain XP from kills, mining, crafting, quests → level up → stat bonuses |
| **Quest System** | 10 dynamic quests with kill/mine/craft/explore/trade objectives |
| **Achievements** | 18 milestones with toast popups and death screen stats |
| **Enchanting** | 6 enchantments: fire, knockback, lifesteal, haste, sharpness, fortune |
| **Potions** | 6 potion types: healing, speed, strength, resistance, night vision, fire resist |
| **Mounts** | Rideable horses near villages — 2.5× speed boost |
| **Exploration** | Find dungeons, ruins, villages, and the hidden enemy castle |
| **Ambient Sounds** | Biome-based audio: birds, wind, cave drips, desert, crickets, echoes |
| **LAN Multiplayer** | Co-op via WebRTC P2P — fight the AI castle together |

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| **Language** | TypeScript |
| **3D Engine** | Three.js |
| **Build Tool** | Vite |
| **Testing** | Vitest + Coverage V8 |
| **Linting** | ESLint + Prettier |
| **CI/CD** | GitHub Actions |

## 📁 Project Structure

```
mattis-abenteuer/
├── src/
│   ├── main.ts              # Game entry point
│   ├── engine/              # Core engine (renderer, physics, input)
│   ├── world/               # Voxel world generation, chunks, biomes
│   ├── crafting/            # Crafting system, recipes, inventory
│   ├── combat/              # Combat mechanics, weapons, damage
│   ├── castle/              # Castle building, spawners, siege
│   ├── entities/            # Players, warriors, enemies, NPCs
│   ├── ai/                  # Enemy AI, pathfinding, army control
│   ├── ui/                  # HUD, menus, inventory screens
│   ├── network/             # PeerJS WebRTC multiplayer
│   ├── effects/             # Particles, sky, torch lights
│   └── __tests__/           # Unit & integration tests
├── docs/
│   ├── PRD.md               # Product Requirements
│   ├── ARCH.md              # Architecture
│   ├── SPEC.md              # Technical Specification
│   └── SDLC.md              # Development Lifecycle
├── public/                  # Static assets (textures, sounds)
├── index.html               # Vite entry HTML
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies & scripts
├── Makefile                 # Developer commands
└── .github/workflows/       # CI/CD pipelines
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- **Git**

### Setup

```bash
git clone https://github.com/AHerttrich/mattis-abenteuer.git
cd mattis-abenteuer
make setup
```

### Development

```bash
make dev       # Start dev server at http://localhost:3000
make test      # Run tests with coverage
make lint      # Run ESLint
make ci        # Run full CI locally (lint + test + build)
```

## 🎯 Game Concept

1. **Explore** — Traverse a vast voxel world to gather resources, discover villages and dungeons
2. **Craft** — Build tools, weapons, armor, potions, and siege equipment
3. **Farm** — Plant crops, grow food, and brew potions for survival
4. **Build** — Construct your castle — each building type spawns different warriors
5. **Trade** — Visit villages to trade with NPCs, recruit warriors, buy rare items
6. **Level Up** — Gain XP from everything you do — unlock stat bonuses and achievements
7. **Quest** — Complete dynamic quests for rare rewards
8. **Discover** — Find the hidden enemy castle deep in the world
9. **Siege** — Send your army and catapults to destroy the enemy fortress
10. **Win** — Reduce the enemy castle to rubble!



## 📄 License

[MIT](LICENSE) — Copyright (c) 2026 Alexander Herttrich
