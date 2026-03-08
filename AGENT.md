# AGENT.md — Mattis Abenteuer

> Quick bootstrap for AI agents. For deep context see:
> `docs/PRD.md` · `docs/ARCH.md` · `docs/SPEC.md` · `docs/SDLC.md`

## Make Commands

```bash
make install    # Install npm dependencies
make setup      # Full setup (install + pre-commit hooks)
make dev        # Start Vite dev server on :3000
make test       # Run Vitest with coverage
make lint       # ESLint check
make format     # Prettier auto-format
make security   # Security scan (npm audit)
make ci         # Full CI: lint + test + build
make clean      # Remove dist/ and coverage/
make help       # List all targets
```

## Repo Map

```
src/
├── main.ts          # Three.js bootstrap, entry point
├── engine/          # Renderer, physics, game loop, XP, quests, farming, potions, achievements, ambient sounds
├── world/           # Voxel chunks, terrain gen, biomes, structures
├── crafting/        # Recipe registry, inventory, item defs (75+ items)
├── combat/          # Damage calc, weapons, projectiles
├── castle/          # Building placement, spawner logic, siege
├── entities/        # Player, warriors, enemies, villagers, mounts (ECS-based)
├── ai/              # Pathfinding (A*), army AI, enemy castle AI
├── ui/              # HUD, menus, crafting UI, inventory UI, trading UI, base build view
├── network/         # PeerJS WebRTC multiplayer (host/join, sync)
├── effects/         # Particles, sky dome, torch lights, weather, post-processing
└── __tests__/       # Vitest unit + integration tests
docs/                # PRD, ARCH, SPEC, SDLC
.github/workflows/   # CI pipeline
```

## Key Patterns

- **ECS Architecture** — Entities have components; systems process them
- **Chunk-based world** — 16×16×64 voxel chunks, lazy-loaded
- **State machines** — Game state, entity AI, combat phases
- **Event bus** — Decoupled communication between systems (`eventBus` + `Events` constants)
- **Host-authoritative multiplayer** — PeerJS WebRTC P2P, host owns game state
- **System instantiation** — All systems created in `main.ts`, updated in game loop
- **Naming** — `camelCase` vars, `PascalCase` types, `UPPER_SNAKE` constants

## Key Bindings

| Key | Action |
|---|---|
| `WASD` | Move |
| `Space` | Jump |
| `Shift` | Sprint |
| `C` | Crafting UI |
| `I` | Inventory (drag & drop, split stack, tooltips) |
| `B` | Base Building View (2D map, place/rearrange/demolish) |
| `E` | Trade with villager / Quick craft |
| `R` | Mount / Dismount horse |
| `F` | Eat food (auto-selects best) |
| `N` | Multiplayer Menu (Host / Join) |
| `M` | Toggle sound |
| `Tab` | Score Dashboard |
| `F5` | Save game |
| `F9` | Load game |
| `ESC` | Close UI / Pause menu |

## Env Vars

See `.env.example` — all optional for local development.

## Deploy Info

| Key | Value |
|---|---|
| GCP Project | `tenacious-tiger-473819-p9` |
| Region | `europe-west1` |
| Deploy Target | None (local game) |
| CI Workflow | `.github/workflows/ci.yml` |
| Branch Prefix | `MA` |

## Related Projects

| Project | Repo | Purpose |
|---|---|---|
| Genesis | `AHerttrich/genesis` | Migration engine |
| Nexus | `AHerttrich/nexus` | AI-powered ITSM |
| Forge | `AHerttrich/forge` | Agentic IDE |
| AI Gov HQ | `AHerttrich/ai-gov-hq` | AI governance |
