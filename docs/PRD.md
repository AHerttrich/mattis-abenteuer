# Product Requirements Document — Mattis Abenteuer

## Vision

**Mattis Abenteuer** is a 3D voxel-based survival-crafting game with an innovative castle warfare endgame. Players explore a procedurally generated world, gather resources, craft equipment, and build a fortress that spawns warriors. The ultimate goal: locate the hidden enemy castle, siege it with your army and catapults, and reduce it to rubble.

Built as a father-son learning project, it combines the creative freedom of Minecraft-style voxel games with strategic RTS elements.

## Problem Statement

Most voxel survival games lack a clear objective and strategic depth. Players build endlessly without a concrete goal. Mattis Abenteuer solves this by introducing a dual-castle warfare system where building, crafting, and combat all serve a clear purpose: defeat the enemy castle.

## Personas

| Persona | Name | Description | Goals |
|---|---|---|---|
| **Primary Player** | Matti | Young gamer (8-12 years old) who loves Minecraft and building | Explore, build cool castles, see warriors fight |
| **Co-op Player** | Parent | Plays alongside Matti, enjoys strategy and progression | Strategic depth, meaningful crafting, teaching moments |
| **Solo Player** | Casual Gamer | Enjoys sandbox games with clear objectives | Relaxed exploration with an exciting endgame |

## Functional Requirements

| ID | Description | Priority | Status |
|---|---|---|---|
| FR-01 | Procedurally generated voxel world with multiple biomes | Must | ✅ Done — 6 biomes (Forest, Plains, Desert, Tundra, Swamp, Mountain) |
| FR-02 | First-person player movement & camera controls | Must | ✅ Done — WASD + mouse look, pointer lock, AABB collision |
| FR-03 | Block placement and destruction mechanics | Must | ✅ Done — Mining progress bar, tool speed multipliers |
| FR-04 | Resource gathering (mining, chopping, harvesting) | Must | ✅ Done — Tools affect harvest speed, blocks drop items |
| FR-05 | Inventory management system | Must | ✅ Done — 36 slots + 9 hotbar, stacking, durability |
| FR-06 | Crafting system with recipe registry | Must | ✅ Done — 30+ recipes, Hand & Anvil stations, UI (C key) |
| FR-07 | Wide material spectrum (wood, stone, iron, gold, crystal, etc.) | Must | ✅ Done — 80+ block types with hardness, drops, colors |
| FR-08 | Weapon & armor crafting (swords, bows, shields, helmets) | Must | ✅ Done — 50+ item definitions |
| FR-09 | Player castle foundation & building system | Must | ✅ Done — Build mode (B key), ghost preview, material costs |
| FR-10 | Warrior spawning based on castle buildings | Must | ✅ Done — 6 warrior types from 8 building types, 30s interval |
| FR-11 | Enemy castle generation — hidden, distant, heavily guarded | Must | ✅ Done — 500–800 blocks away, procedural, guarded |
| FR-12 | Enemy AI defenders (guards, archers, knights) | Must | ✅ Done — 8-state AI (Idle → Patrol → Alert → Chase → Attack → March → Flee → Retreat) |
| FR-13 | Army pathfinding and march mechanics | Should | ✅ Done — A* pathfinding wired to WarriorManager with terrain step-up/down |
| FR-14 | Catapult crafting and ranged siege mechanics | Should | ✅ Done — Gravity-arc projectiles, AOE block destruction |
| FR-15 | Block destruction by warriors and projectiles | Must | ✅ Done — Catapult boulders destroy blocks, explosions |
| FR-16 | Win condition: enemy castle fully destroyed | Must | ✅ Done — Throne room destroy triggers victory/defeat |
| FR-17 | Day/night cycle affecting gameplay | Could | ✅ Done — Sun tracks player, ambient light adjusts, stars at night |
| FR-18 | Basic HUD (health, inventory, minimap) | Must | ✅ Done — HUD, minimap, score dashboard (Tab), damage numbers |
| FR-19 | Sound effects and ambient audio | Could | ✅ Done — Procedural Web Audio: mine, place, hit, craft, jump, explosion, ambient |
| FR-20 | Save/load game state | Should | ✅ Done — F5/F9 save/load, 60s auto-save via LocalStorage |
| FR-21 | Village NPCs with trading | Should | ✅ Done — 4 professions (blacksmith/farmer/merchant/recruiter), trade tables |
| FR-22 | Base building 2D map view | Should | ✅ Done — Bird's-eye canvas, rearrange, demolish with 50% refund, tooltips |
| FR-23 | Inventory drag & drop UI | Should | ✅ Done — Drag-and-drop, tooltips, split stack, rich item info |
| FR-24 | XP & level progression system | Should | ✅ Done — XP from kills/mining/crafting/quests, level-up stat bonuses |
| FR-25 | Farming system (plant/grow/harvest) | Should | ✅ Done — 4 crops (wheat/carrot/potato/pumpkin), water bonus, growth stages |
| FR-26 | Quest system with dynamic objectives | Should | ✅ Done — 10 quest templates, event-driven progress, auto-refresh |
| FR-27 | Achievement milestones | Could | ✅ Done — 18 achievements, toast popups, death screen stats |
| FR-28 | Enchanting system for weapons | Could | ✅ Done — 6 enchantments: fire, knockback, lifesteal, speed, sharpness, fortune |
| FR-29 | Potion brewing & effects | Could | ✅ Done — 6 potions: healing, speed, strength, resistance, night vision, fire resist |
| FR-30 | Rideable mounts | Could | ✅ Done — Horses near villages, R-key mount/dismount, 2.5× speed |
| FR-31 | Biome-based ambient sounds | Could | ✅ Done — 7 biome sounds via Web Audio synthesis |
| FR-32 | Visual rendering pipeline (bloom, AO, fog, animated textures) | Could | ✅ Done — Post-processing, per-vertex AO, height fog, animated lava, underwater tint, dynamic crosshair |
| FR-33 | Weather particles per biome | Could | ✅ Done — Rain in swamp/forest, snow in tundra with smooth transitions |
| FR-34 | Fighter visual identity (pennants, body shapes, team colors) | Could | ✅ Done — Team flags, per-type bodies, shoulder plates, eye dots, crown/horse/quiver |
| FR-35 | Type-specific castle building 3D structures | Could | ✅ Done — Barracks (beds, weapons), archery (open-air, targets), stable (fence, hay), siege (iron, anvil) |

## Non-Functional Requirements

| ID | Description | Target |
|---|---|---|
| NFR-01 | Frame rate | ≥ 30 FPS on mid-range hardware |
| NFR-02 | Chunk loading time | < 100ms per chunk |
| NFR-03 | World size | Minimum 1000×1000 blocks |
| NFR-04 | Memory usage | < 2GB RAM |
| NFR-05 | Code coverage | > 80% unit test coverage |
| NFR-06 | Browser support | Chrome, Firefox, Edge (latest 2 versions) |
| NFR-07 | Device support | Desktop (keyboard + mouse) |

## Success Metrics

| Metric | Target |
|---|---|
| Core gameplay loop playable | End of Phase 2 |
| Full castle warfare working | End of Phase 3 |
| Code coverage | > 80% |
| Performance | Stable 30+ FPS |
| Fun Factor | Matti wants to keep playing! 🎮 |

## Phased Roadmap

### Phase 1: Foundation 🏗️
- Voxel engine (chunk system, rendering, block types)
- Player controller (movement, camera, physics)
- Block placement and destruction
- Basic world generation (flat terrain + noise-based hills)

### Phase 2: Survival & Crafting ⛏️
- Inventory system
- Resource gathering mechanics
- Crafting workbench and recipe system
- Material spectrum (10+ materials)
- Basic weapons and tools
- Health system and damage

### Phase 3: Castle Warfare ⚔️
- Player castle building system
- Warrior spawning from buildings
- Enemy castle generation (hidden, guarded)
- Army AI and pathfinding
- Combat system (melee + ranged)
- Catapult mechanics
- Win condition

### Phase 4: Polish & Content 🎨
- Biome diversity (forest, desert, mountains, swamp)
- Day/night cycle
- Sound effects and music
- HUD and UI polish
- Save/load system
- Additional crafting recipes (50+ recipes)
- Enemy variety (different guard types)
- Performance optimization

### Phase 5: Villages & NPCs 🏘️
- Village NPC system (4 professions: blacksmith, farmer, merchant, recruiter)
- Trading UI (buy/sell items, recruit warriors)
- Base building 2D map view (rearrange, demolish, compass, tooltips)
- Inventory UX overhaul (drag & drop, tooltips, split stack)

### Phase 6: Combat & Balance ⚔️
- Combat polish (knockback, crits, damage numbers, attack cooldowns)
- Wave system (enemy raids on player castle)
- Cave mob system (skeletons, spiders in underground)
- Weather system (rain, snow, fog)

### Phase 7: Full Feature Expansion 🌟
- XP & level progression (stat bonuses per level)
- Farming system (4 crops, growth stages, water bonus)
- Quest system (10 dynamic quests with auto-refresh)
- Achievement system (18 milestones, toast popups)
- Enchanting system (6 weapon enchantments)
- Potion system (6 potion types with active effects)
- Mount system (rideable horses, 2.5× speed)
- Ambient sound system (7 biome-based sounds)

### Phase 8: Visual Polish 🎨✨
- Post-processing pipeline (bloom, ACES tone mapping, height-based fog)
- Per-vertex ambient occlusion and biome color variation
- Animated textures (lava flow) and emissive glowing blocks
- Weather system (per-biome rain/snow particles)
- Fighter visual identity (team pennant flags, per-type body shapes, shoulder plates)
- Castle building visuals (type-specific 3D structures with banners and torches)
- Base builder UI polish (fit-all zoom, rearrange, demolish, tooltips, compass)
- Enhanced start screen, dynamic crosshair, underwater tint, warrior walk animations

## Implementation Status

| Phase | Progress | Notes |
|---|---|---|
| Phase 1: Foundation | 🟢 100% | Voxel engine, player controller, block placement, world gen |
| Phase 2: Survival & Crafting | 🟢 100% | Inventory, crafting UI/recipes, mining progress, fall damage |
| Phase 3: Castle Warfare | 🟢 100% | Castles, warriors, AI, catapult projectiles, win/loss |
| Phase 4: Polish & Content | 🟢 100% | Day/night, 6 biomes, minimap, sound, save/load, multiplayer |
| Phase 5: Villages & NPCs | 🟢 100% | NPC trading, base building view, inventory UX overhaul |
| Phase 6: Combat & Balance | 🟢 100% | Waves, cave mobs, weather, combat polish |
| Phase 7: Full Feature Expansion | 🟢 100% | XP, farming, quests, achievements, enchanting, potions, mounts, ambient |
| Phase 8: Visual Polish | 🟢 100% | Post-processing, weather, fighter identity, castle visuals, base builder UI |

