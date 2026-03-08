# Steel and Sigils - Game Testing

## Overview

This directory contains a separate testing environment for Steel and Sigils, isolated from the main game. Use this to test new features, units, perks, and mechanics without going through the normal game flow.

## Files

- `dev.html` - Testing environment (gitignored, not for players)
- `dev.js` - Testing-specific JavaScript with console commands
- `README.md` - This file

## Features

### Console Commands

Open browser DevTools (F12) → Console to use these commands:

```javascript
// Spawn units
spawn('PALADIN', 2, 3, 'player')     // Spawn player Paladin at x=2, y=3
spawn('ORC_WARRIOR', 8, 5, 'enemy')  // Spawn enemy Orc at x=8, y=5

// Unit management
select(2, 3)                         // Select unit at position
kill(2, 3)                           // Kill unit at position
heal(2, 3, 50)                       // Heal unit by 50 HP
damage(2, 3, 30)                     // Deal 30 damage to unit

// Stats editing
setStat('health', 200)               // Set selected unit's max HP to 200
setStat('damage', 50)                // Set selected unit's damage to 50
setStat('moveRange', 5)              // Set selected unit's movement to 5

// Perks and buffs
addPerk('legendary')                 // Add legendary perk option
addPerk('mythic')                    // Add mythic perk option
addBuff('doubleStrike')              // Add Blood Frenzy (Berserker)
addBuff('cleave')                    // Add Divine Wrath (Paladin)
addBuff('ricochet')                  // Add Ricochet Shot (Ranger)
addBuff('piercing')                  // Add Arcane Pierce (Sorcerer)
addBuff('backstab')                  // Add Shadow Strike (Rogue)
addBuff('divineRetribution')         // Add Divine Retribution (Paladin mythic)
addBuff('arcaneFocus')               // Add Arcane Focus (Sorcerer mythic)

// Spells
setMana(100)                         // Set hero mana to 100
cast('fireball', 5, 5)               // Cast fireball at x=5, y=5

// Game state
endRound()                           // End current round, trigger rewards
reset()                              // Clear all units and reset grid
clearLog()                           // Clear combat log

// Testing helpers
testScenario('legendary_ranger')     // Load predefined test scenario
testScenario('mythic_paladin')       // Load predefined test scenario
snapshot()                           // Take screenshot of current state
```

## Predefined Test Scenarios

### `legendary_ranger`
- Spawns Ranger with almost enough XP for legendary reward
- Ends round → triggers buff selection
- Allows immediate testing of Ricochet Shot

### `mythic_paladin`
- Spawns Paladin with Divine Wrath (legendary)
- Ends round → can select Divine Retribution (mythic)
- Tests mythic perk requirements

### `full_army`
- Spawns all 9 player units
- Spawns 5 enemies of each faction
- Full combat scenario for balance testing

## Usage for Automated Testing

The testing sub-agent can:
1. Open `dev.html` in browser
2. Execute console commands via `browser evaluate`
3. Take screenshots to verify visual state
4. Check console logs for errors

Example test flow:
```javascript
// Sub-agent testing workflow
1. Open dev.html
2. Execute: testScenario('legendary_ranger')
3. Execute: endRound()
4. Screenshot: Verify buff selection modal appears
5. Execute: clickBuff('ricochet')
6. Screenshot: Verify Ranger has ricochet perk
7. Execute: spawn('ORC_WARRIOR', 8, 5, 'enemy')
8. Execute: selectRanger()
9. Execute: attack(8, 5)
10. Screenshot: Verify ricochet bounce animation
```

## Development Workflow

1. **Implement feature** in main codebase (`src/`)
2. **Export to dev** - Make functions available in `dev.js`
3. **Test manually** using console commands
4. **Automated test** - Sub-agent runs test scenario
5. **Screenshot comparison** - Verify no regressions
6. **Commit** when tests pass

## Notes

- All console commands return promises - use `await` in scripts
- Errors are logged to console for debugging
- Grid is 15×15 (larger than normal game for testing)
- No victory conditions - play indefinitely
- All units have infinite movement in dev mode (optional toggle)
