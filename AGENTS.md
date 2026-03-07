# Steel and Sigils: Agent Overview

## Project Overview

Steel and Sigils is a browser-based turn-based tactical combat game inspired by Heroes of Might and Magic 5. Built with Phaser 3, vanilla JavaScript (ES6 modules), and CSS. No build tools required - runs directly in browser.

## Project Structure

```
├── index.html              # Main HTML, UI structure
├── style.css               # Styling - Grim Dark Fantasy theme
├── README.md               # User-facing documentation
├── AGENTS.md               # This file - developer guide
├── LICENSE                 # Project license
│
├── src/                    # Source code (ES6 modules)
│   ├── main.js             # Entry point - Phaser bootstrap, GAME_VERSION
│   ├── GameConfig.js       # Constants, CONFIG, SPELLS, STAGES (3 maps)
│   ├── SceneManager.js     # BattleScene, PreGameScene, reward system
│   ├── EntityManager.js    # Unit class, UnitManager, TurnSystem
│   ├── InputHandler.js     # GridSystem - input handling, obstacles
│   ├── SpellSystem.js      # Spell casting, effects
│   └── UIHandler.js        # UIManager - DOM updates, floating text
│
└── images/                 # Unit sprites & obstacles
    ├── player/             # 9 player unit PNGs
    ├── enemy/              # Enemy factions (Greenskin, Dungeon, Cultist)
    └── obstacles/          # wall.png, rock.png
```

## Game Architecture

### Core Systems

| System | File | Responsibility |
|--------|------|----------------|
| **BattleScene** | SceneManager.js | Main game loop, combat, rewards |
| **UnitManager** | EntityManager.js | Unit creation, placement, tracking |
| **TurnSystem** | EntityManager.js | Initiative queue, AI turns, rounds |
| **GridSystem** | InputHandler.js | Tile grid, obstacles, movement highlighting |
| **SpellSystem** | SpellSystem.js | Mana, spell casting, effects |
| **UIManager** | UIHandler.js | DOM updates, UI panels, floating text |

### Unit Properties

Units are instances of the `Unit` class with these key properties:
- `type`, `name`, `emoji`, `health`, `maxHealth`, `damage`
- `moveRange`, `rangedRange`, `initiative`, `isPlayer`
- `gridX`, `gridY`, `sprite`, `healthBar`
- Buff/debuff tracking: `hasteRounds`, `shieldRounds`, `blessRounds`, etc.
- **Legendary perks**: `hasDoubleStrike`, `hasCleave`, `hasRicochet`, `hasPiercing`, `hasBackstab`
- **Mythic perks**: `hasDivineRetribution`, `hasArcaneFocus`
- `glowEffect` - Phaser sprite for legendary/mythic aura

## Reward System (Rarity Tiers)

### Buff Rarities
- **Common** (green): +HP, +DMG, +MOV, +INIT, Ranged Training
- **Epic** (purple): Champion's Favor, Obsidian Armor, Glass Cannon, Temporal Shift
- **Legendary** (orange): Blood Frenzy, Divine Wrath, Ricochet Shot, Arcane Pierce, Shadow Strike
- **Mythic** (red): Divine Retribution, Arcane Focus

### Legendary Perks by Unit

| Unit | Legendary | Effect |
|------|-----------|--------|
| Berserker | Blood Frenzy | Strikes 2× per attack |
| Paladin | Divine Wrath | 3×3 cleave, +40 DMG |
| Ranger | Ricochet Shot | Arrows bounce, +40 DMG |
| Sorcerer | Arcane Pierce | 999 range, pierces all |
| Rogue | Shadow Strike | +100% backstab damage |

### Mythic Perks Requirements
- **Mythic perks can ONLY be acquired by units that already have their legendary perk**
- Paladin: Requires Divine Wrath (hasCleave) → Divine Retribution
- Sorcerer: Requires Arcane Pierce (hasPiercing) → Arcane Focus

### Visual Indicators
- **Legendary**: Subtle animated orange glow on unit sprite
- **Mythic**: More visible animated red glow (replaces legendary glow)

## Maps (Stages)

Defined in `GameConfig.js`:

| Stage | Size | Points | Features |
|-------|------|--------|----------|
| Whispering Woods | 10×8 | 1000 | Grass, open field |
| Ruins of a Castle | 15×15 | 1700 | Dirt, stone walls (wall.png) |
| Mountain Pass | 13×11 | 1300 | Mountains, chokepoint (rock.png) |

## Key Implementation Notes

### Adding Glow Effects
Unit glows are Phaser sprites with blend modes:
```javascript
// In UnitManager.addUnit() or when applying buff
if (!unit.glowEffect) {
    unit.glowEffect = this.scene.add.sprite(spriteX, yBottom, imageKey);
    unit.glowEffect.setScale(scale * 1.2);
    unit.glowEffect.setBlendMode(Phaser.BlendModes.ADD);
}
// Legendary: orange tint, Mythic: red tint
unit.glowEffect.setTint(0xff8c00); // orange for legendary
unit.glowEffect.setTint(0xff0000); // red for mythic
```

### Obstacle Types
- `addObstacle(x, y, type)` supports `'wall'` and `'rock'`
- Walls used in Ruins, rocks used in Mountain Pass

### AI Pathfinding
- A* implementation in `TurnSystem.findPath()`
- Accounts for 2×2 bosses with `getOccupiedPositions()`

### Saving/Loading
- `prepareSaveData()` / `restoreFromSave()` in SceneManager
- Preserves legendary/mythic buffs via `statModifiers`

## Image Generation

Sprite generation scripts are in `utils/` folder:

```
utils/
├── generate-sprites.js     # Generate unit sprites
├── generate_tiles.js       # Generate background tiles & obstacles
└── temp/                   # Test images (gitignored)
```

### Generate Unit Sprites

Uses Pollinations.ai API with `zimage` model (best for pixel art):

```bash
cd utils
node generate-sprites.js
```

**Features:**
- Reads `src/units.js` to find all image paths
- Generates only missing images
- Saves to `images/` folder in appropriate subdirectories
- Uses consistent prompt style for grim-dark fantasy aesthetic

### Generate Background Tiles

```bash
cd utils
node generate_tiles.js
```

**Generates:**
- `grass.png`, `dirt.png`, `road.png` (64×64) - muted/greyed for backgrounds
- `wall_large.png`, `rock_large.png` (72×72) - slightly larger obstacles that overflow cells

### Model Testing

To test different Pollinations models:

1. Generate test images to `utils/temp/`
2. Compare quality and style
3. Currently using **zimage** (cheapest + best pixel art consistency at 0.002/img)

**Pricing reference:**
- flux / flux-2-dev: 0.001/img (cheapest but may have backgrounds)
- zimage: 0.002/img (recommended for pixel art)
- imagen-4: 0.0025/img (higher quality but adds text/watermarks)

## Development Tips

- Version is in `src/main.js` - increment by 0.01 per commit
- Use `generate-sprites.js` to generate missing unit images
- All sprites face left-to-right; enemies flipped with `setFlipX(true)`
- Grid is dynamic - tile size calculated per stage to fit 640×512 canvas

---

## Mobile & App Store Roadmap

### Technology Choice: Phaser → Capacitor

**Current:** Browser-based Phaser 3 game  
**Future:** Wrapped as native iOS/Android app using Capacitor

This is the most efficient path - same codebase works everywhere, minimal rewrite required.

### Project Structure for Mobile

```
steel-and-sigils/
├── src/                    # Game code (Phaser)
├── images/                 # All assets (local only)
├── index.html              # Entry point
├── manifest.json           # PWA manifest (future)
├── capacitor.config.ts     # Capacitor config (future)
└── android/                # Generated by Capacitor (future)
└── ios/                    # Generated by Capacitor (future)
```

### Code Guidelines (Do NOW)

**1. Use Local Assets Only**
```javascript
// ✅ GOOD - local path
this.load.image('unit', 'images/player/knight.png');

// ❌ BAD - CDN dependency (breaks offline)
this.load.image('unit', 'https://cdn.example.com/knight.png');
```

**2. Use Relative Paths**
```javascript
// ✅ GOOD
fetch('./data/units.json')

// ❌ BAD
fetch('http://localhost:5500/data/units.json')
```

**3. Avoid Browser-Specific APIs**
```javascript
// ❌ AVOID localStorage - use in-memory or Capacitor Storage later
localStorage.setItem('save', data);

// ✅ USE in-game state for now
this.gameState.saveData = data;
```

**4. Keep UI in DOM**
```javascript
// ✅ GOOD - DOM buttons work everywhere
<button id="spell-btn">Fireball</button>

// ❌ AVOID pure canvas UI - harder to make responsive
this.add.text(x, y, 'Fireball'); // canvas text
```

### Capacitor Integration Plan

**Phase 1: Development (NOW)**
- Continue building in browser
- Follow guidelines above
- Test in Chrome/Safari DevTools mobile view

**Phase 2: Pre-Launch**
```bash
# Add Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init SteelAndSigils com.yourname.steelsigils --web-dir .
npx cap add android
npx cap add ios
```

**Phase 3: App Stores**
- Android: `npx cap open android` → Build APK → Play Store ($25 one-time)
- iOS: `npx cap open ios` → Build IPA → App Store ($99/year)

### Mobile UX Considerations

**Touch Controls Needed:**
- Tap to select unit → tap destination to move
- Tap to select spell → tap target to cast
- Pinch to zoom camera
- Larger touch targets (min 44×44px)

**Responsive Layout:**
- Game canvas scales to screen size
- UI panels stack vertically on narrow screens
- Spell buttons larger on touch devices

**Performance:**
- Sprite atlases for fewer draw calls
- Limit particle effects on low-end devices
- Test on actual devices (not just simulators)

### Future Mobile Features

| Feature | Implementation | Priority |
|---------|---------------|----------|
| Touch controls | Tap-to-move, tap-to-attack | High |
| Camera zoom | Pinch gesture | Medium |
| Haptic feedback | Capacitor Haptics plugin | Low |
| Cloud saves | Capacitor + backend | Low |
| Push notifications | Capacitor Local Notifications | Low |

### Store Requirements Checklist

**Play Store:**
- [ ] APK builds successfully
- [ ] App icon (512×512 PNG)
- [ ] Feature graphic (1024×500)
- [ ] Screenshots (phone + tablet)
- [ ] Privacy policy

**App Store:**
- [ ] IPA builds successfully
- [ ] App icon (1024×1024)
- [ ] Screenshots (all device sizes)
- [ ] App Store preview video
- [ ] Privacy nutrition label

**Note:** App Store is pickier about webview apps. Ensure the game feels "native enough" - no browser chrome, proper splash screen, native-feeling transitions.
