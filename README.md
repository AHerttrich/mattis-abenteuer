# Mattis Abenteuer 🏰⚔️

[![CI](https://github.com/AHerttrich/mattis-abenteuer/actions/workflows/ci.yml/badge.svg)](https://github.com/AHerttrich/mattis-abenteuer/actions/workflows/ci.yml)

> A 3D voxel survival-crafting castle warfare game — gather resources, craft weapons, build your fortress, and conquer the enemy castle.

## 🎮 Features

| Feature | Description |
|---|---|
| **Voxel World** | Procedurally generated 3D world with diverse biomes and materials |
| **Survival & Crafting** | Wide spectrum of resources, tools, weapons, and armor to craft |
| **Castle Building** | Build your own fortress — structures determine which warriors spawn |
| **Army Management** | Warriors auto-spawn from castle buildings and march toward the enemy |
| **Castle Warfare** | Siege the enemy castle with warriors and catapults |
| **Exploration** | Find the hidden, heavily-guarded enemy castle across the vast world |
| **LAN Multiplayer** | Co-op mode — fight the AI castle together over your home network (WebRTC P2P) |

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

1. **Explore** — Traverse a vast voxel world to gather resources
2. **Craft** — Build tools, weapons, armor, and siege equipment
3. **Build** — Construct your castle — each building type spawns different warriors
4. **Discover** — Find the hidden enemy castle deep in the world
5. **Siege** — Send your army and catapults to destroy the enemy fortress
6. **Win** — Reduce the enemy castle to rubble!

## 🔗 Related Projects

| Project | Description |
|---|---|
| [Genesis](https://github.com/AHerttrich/genesis) | Migration engine for enterprise platform transformations |
| [Nexus](https://github.com/AHerttrich/nexus) | AI-powered ITSM platform |
| [Forge](https://github.com/AHerttrich/forge) | Sovereign agentic IDE |
| [AI Gov HQ](https://github.com/AHerttrich/ai-gov-hq) | AI governance dashboard |

## 📄 License

[MIT](LICENSE) — Copyright (c) 2026 Alexander Herttrich
