# Tank Battle Game - Detailed Summary

## Overview
A browser-based tank artillery game with physics-based projectile mechanics, terrain destruction, and multiple game modes.

## Core Mechanics

### Controls
- **Drag to aim**: Click and drag from tank to set angle and power
- **Q/E or buttons**: Move left/right (consumes fuel)
- **1-5**: Switch weapons
- **Keys**: Keyboard shortcuts for menu navigation

### Game Flow
1. **Menu**: Select game mode toggles
2. **Tank Select**: Choose from 15+ tank types
3. **Map Select**: Choose battlefield
4. **Battle**: Take turns firing until one tank dies

---

## Tank Types

### Base Tanks (Unlocked)
| Tank | HP | Speed | Fuel | Theme |
|------|-----|-------|------|-------|
| Abrams | 1000 | 1.5 | 100 | Classic military |
| Frost | 1200 | 1.3 | 110 | Ice & snow |
| Blaze | 950 | 1.2 | 90 | Fire & burn |
| Toxic | 850 | 1.6 | 120 | Poison & acid |
| Electro | 1100 | 1.0 | 80 | Lightning |
| Atomic | 1050 | 0.8 | 70 | Nuclear |
| Solar | 950 | 1.3 | 100 | Sun & lava |
| Terra | 1150 | 0.9 | 80 | Earth & rock |
| Hades | 950 | 1.4 | 110 | Fire + poison |
| Anubis | 900 | 1.5 | 120 | Mud + poison |

### Locked Tanks (Code: 146)
| Tank | HP | Special |
|------|-----|---------|
| Thermonuclear | 1 | H-Bomb weapon, massive damage |
| Chaos | 66666 | Oblivion weapon (all behaviors) |
| Actual Drill | 66666 | Erases terrain completely |
| ??? | 66666 | Swarm weapon (100 bounces) |
| Ground Zero | 66666 | NUKE weapon (strips map) |
| Rubber | 66666 | Bouncy weapons |
| Random | 66666 | Random weapon each shot |
| Boomerang | 66666 | Curving returning shots |
| **Invincible** | **1** | **Infinite shield, vampire heal on block** |

---

## Maps

| Map | Gravity | Terrain | Special |
|-----|---------|---------|---------|
| Plains | 0.3 | Normal | Abrams boost |
| Desert | 0.3 | Sand | Terra/Anubis boost |
| Snow | 0.3 | Normal | Frost boost, ice patches |
| Moon | 0.15 | Rock | Atomic/Electro/Thermo boost |
| Volcano | 0.3 | Rock | Blaze/Solar/Hades boost, lava floor |

---

## Weapon Behaviors

| Behavior | Effect |
|----------|--------|
| split | Fragments scatter on impact |
| cluster | Fragments arc on impact |
| bounce | Bounces off terrain |
| rain | Bomblets drop from sky |
| drill | Deep crater, terrain destruction |
| homing | Tracks enemy tank |
| drillRain | Drill + rain combo |
| tomb | Drill + raise walls |
| erase | Completely removes terrain |
| swarm | 100 bounces, multiplies |
| groundzero | Strips entire map layer |
| pinball | 50 bounces, no terrain damage |
| boomerang | Flies out, curves back to shooter |
| random | Copies random weapon |

---

## Hazards (Ground Effects)

| Hazard | Effect |
|--------|--------|
| fire | Damage over time |
| poison | Damage over time, larger radius |
| radiation | Long-lasting damage zone |
| ice | Slippery, no friction |
| lava | High damage, cools to rock |
| mud | Slows movement |
| water | No movement, just swaying |
| acid | High damage |
| acidFire | Fire + acid combo |
| hellfire | Purple fire, high damage |

---

## Game Mode Toggles

### Always Available
- **Simple Aiming**: Easier trajectory prediction
- **Chaos Mode**: Weapons bounce 10 times
- **Triple Mode**: Fire 3 shots at once
- **Music**: Toggle background music
- **Test Bot**: Practice mode
- **Wind**: Random wind affects shots

### Locked (Code: 146)
- **Shield Box**: Crates always give shields

---

## Special Mechanics

### Vampire Shield
- When shield blocks damage: heals 50% of blocked amount
- Invincible tank always has this

### Infinite Shield (Invincible Tank)
- Shield never breaks
- Always rebounds shots
- Always heals on block (vampire)
- Starts at 1 HP, must heal via blocking

### Rebound Shield
- When any shield is hit: shot bounces back at shooter
- 80% velocity, 70% radius, 60% damage

### Superbounce (Removed)
- Was 300% wall bounce speed
- Now normal 80% bounce

---

## Crate System

**Normal Mode:**
- 25% chance: Shield
- 75% chance: Random weapon from any tank

**Shield Box Mode (146):**
- 100% shield (if no shield already)

---

## Recent Changes

1. **Boomerang physics** - Proper arc trajectory, returns to shooter
2. **Trajectory preview** - Shows predicted path for all weapons
3. **Invincible tank** - 1 HP, infinite shield, vampire heal
4. **Shield Box toggle** - Locked mechanic for guaranteed shields
5. **Vampire shields** - Heal on block (50% of damage)
6. **Rebound mechanics** - Shields bounce shots back

---

## Code 146 Unlocks

Entering code `146` unlocks:
- All locked tanks (Thermonuclear, Chaos, Actual Drill, ???, Ground Zero, Rubber, Random, Boomerang, Invincible)
- Shield Box toggle in menu

---

## Technical Notes

- Canvas-based rendering
- Procedural terrain generation
- Physics simulation with gravity
- LocalStorage for win tracking and unlocks
- Synthesized audio (Web Audio API)
- No external dependencies

## File Location
`/Users/efton/projects/tank_game.html`
Live at: `askclaudeykitty.github.io/tank_game.html`
