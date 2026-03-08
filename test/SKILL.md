# Game Tester Skill

Automated testing for Steel and Sigils browser game.

## Purpose

This skill enables automated testing of game features using the browser tool. It opens the dev environment, executes test scenarios, takes screenshots, and verifies behavior.

## Test Environment

- **URL**: `http://127.0.0.1:5500/test/dev.html`
- **Grid Size**: 15x15 (larger than normal game)
- **Features**: Spawn any unit, edit stats, add perks, run scenarios

## Console Commands Available

```javascript
// Spawn units
dev.spawn('PALADIN', 2, 7, 'player')    // Spawn player unit
dev.spawn('ORC_WARRIOR', 8, 7, 'enemy') // Spawn enemy

// Select and modify
dev.select(2, 7)                        // Select unit at position
dev.setStat('damage', 100)              // Edit stat
dev.addBuff('ricochet')                 // Add legendary perk
dev.addBuff('divineRetribution')        // Add mythic perk

// Game flow
dev.endRound()                          // End round, trigger rewards
dev.fullMana()                          // Set mana to max

// Scenarios
dev.testScenario('legendary_ranger')    // Pre-configured test
dev.testScenario('mythic_paladin')
dev.testScenario('full_army')
dev.testScenario('boss_fight')

// Testing
dev.snapshot()                          // Take screenshot
dev.getLogs()                           // Get console output
dev.reset()                             // Clear grid
```

## Test Patterns

### Pattern 1: Feature Implementation Test

```
1. Sub-agent A implements feature
2. Sub-agent B tests in dev.html:
   - Open dev.html
   - Run testScenario
   - Take screenshot
   - Verify no errors in logs
3. Report results to main agent
```

### Pattern 2: Regression Test

```
1. Before commit: take baseline screenshots
2. After changes: run same scenarios
3. Compare screenshots for visual regressions
4. Check logs for new errors
```

### Pattern 3: Perk Testing

```
For new mythic perk:
1. Spawn unit that qualifies
2. Add prerequisite legendary perk
3. End round
4. Select mythic option
5. Verify perk applied
6. Test in combat
```

## Usage Examples

### Test a new ranger mythic perk:

```bash
# In dev.html console:
dev.testScenario('legendary_ranger')  // Has ranger with ricochet
dev.endRound()                        // Trigger mythic option
// (Manually select mythic or add command to auto-select)
dev.spawn('ORC_WARRIOR', 8, 7, 'enemy')
dev.select(2, 7)                      // Select ranger
dev.snapshot()                        // Before attack
// (Attack enemy)
dev.snapshot()                        // After - verify bounce
```

### Automated test via sub-agent:

```javascript
// Spawn testing sub-agent
sessions_spawn({
  task: "Test Steel and Sigils mythic perk",
  mode: "run",
  thinking: "Use browser to open dev.html, run legendary_ranger scenario, add mythic perk, verify in combat"
})
```

## Error Detection

Check for these in `dev.getLogs()`:
- `TypeError` - JavaScript errors
- `undefined is not a function` - Missing methods
- `HTTP 404` - Missing assets
- `Phaser` errors - Game engine issues

## Screenshots

Use `dev.snapshot()` after key actions:
- Initial state
- After spawning units
- After applying perks
- After combat actions

Returns: `{ timestamp, success }`

## Best Practices

1. **Always reset** before new test: `dev.reset()`
2. **Check logs** after each action for errors
3. **Use scenarios** for common test setups
4. **Take screenshots** at key verification points
5. **Test edge cases**: empty grid, max units, invalid positions

## Integration with GitHub

When testing PRs:
1. Checkout PR branch
2. Start dev server
3. Run test scenarios
4. Post screenshot results as PR comment
5. Approve/reject based on test results
