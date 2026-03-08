# Steel and Sigils - Development Workflow

## Overview

This document describes the multi-agent development workflow for Steel and Sigils. It enables parallel work with real-time updates while maintaining a single conversation thread.

## Architecture

```
┌─────────────────┐
│  German (User)  │◄──────► Telegram Chat
│   @g_hripkov    │         (Continuous conversation)
└────────┬────────┘
         │
         │ Main agent (Buddy)
         │ - Spawns sub-agents
         │ - Manages tasks
         │ - Provides summaries
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────┐  ┌────────┐
│Tester  │  │ Coder  │  │ Reporter│  ... (Sub-agents)
│Agent   │  │ Agent  │  │ Agent   │
└───┬────┘  └───┬────┘  └───┬────┘
    │           │           │
    └───────────┴───────────┘
                │
                ▼
        Direct Telegram Messages
        (Real-time updates to German)
```

## Agent Roles

### Main Agent (Buddy)
- **Location**: This Telegram chat
- **Availability**: Always on
- **Responsibilities**:
  - Understand user requests
  - Spawn appropriate sub-agents
  - Manage task queue
  - Provide summaries and context
  - Answer questions anytime

### Coder Sub-Agent
- **Trigger**: New feature request, bug fix
- **Mode**: `run` (one-shot) or `session` (continuous)
- **Updates sent to user**:
  - "📝 Starting implementation of [feature]"
  - "💾 Commit: [message]"
  - "✅ Feature complete, pushed to GitHub"
  - "❌ Error encountered: [details]"
- **Deliverables**: Working code, git commits

### Tester Sub-Agent
- **Trigger**: After coder completes, or on demand
- **Mode**: `run`
- **Updates sent to user**:
  - "🧪 Opening test environment..."
  - "📸 Screenshot: Initial state"
  - "✅ Test passed: [scenario]"
  - "❌ Issue found: [description + screenshot]"
- **Deliverables**: Test report, screenshots, pass/fail status

### Reporter Sub-Agent (Optional)
- **Trigger**: Long-running tasks
- **Mode**: `run`
- **Updates sent to user**:
  - Progress updates every N minutes
  - Current status
  - ETA

## Workflow Patterns

### Pattern 1: Feature Implementation

```
User: "Add a new mythic perk for Ranger that gives lifesteal"

Main Agent:
  1. Acknowledge request
  2. Spawn Coder Agent:
     - Task: Implement Lifesteal perk
     - Include: Unit type, perk logic, description
  3. Report to user: "Coder agent working on it..."

Coder Agent (background):
  - Sends: "📝 Starting Lifesteal perk implementation"
  - Works on code
  - Sends: "💾 Commit: Add Lifesteal mythic perk for Ranger"
  - Sends: "✅ Done! Pushed to main branch"

Main Agent (when coder reports back):
  - "Coder finished. Should I spawn tester to verify?"

User: "Yes, test it"

Main Agent:
  4. Spawn Tester Agent:
     - Task: Test Lifesteal perk
     - Include: Test scenarios

Tester Agent (background):
  - Sends: "🧪 Opening dev.html..."
  - Sends: "📸 Screenshot: Ranger with Lifesteal"
  - Sends: "✅ Test passed: Lifesteal heals 20% damage"
  - Sends: "📊 Full report: [link]"

Main Agent (when tester reports back):
  - "✅ All tests passed! Lifesteal perk is live."
```

### Pattern 2: Bug Fix

```
User: "Bug: Paladin's cleave damage is wrong"

Main Agent:
  1. Spawn Tester Agent first:
     - Task: Reproduce and document the bug

Tester Agent:
  - Sends: "🐛 Reproducing Paladin cleave bug..."
  - Sends: "📸 Screenshot: Expected 40 dmg, got 25"
  - Sends: "📋 Bug confirmed: Damage calculation error"

Main Agent:
  2. Spawn Coder Agent:
     - Task: Fix cleave damage calculation
     - Include: Tester's findings

Coder Agent:
  - Sends: "🔧 Fixing cleave damage..."
  - Sends: "💾 Commit: Fix Paladin cleave damage formula"
  - Sends: "✅ Fix deployed"

Main Agent:
  3. Spawn Tester Agent:
     - Task: Verify fix

Tester Agent:
  - Sends: "✅ Fix verified: Cleave now deals correct 40 damage"

Main Agent:
  - "🎉 Bug fixed and verified!"
```

### Pattern 3: Parallel Tasks

```
User: "Add 3 new units: Druid, Necromancer, and Engineer"

Main Agent:
  1. Spawn 3 Coder Agents in parallel:
     - Coder 1: Druid implementation
     - Coder 2: Necromancer implementation
     - Coder 3: Engineer implementation

All Coders (simultaneously):
  - Each sends their own updates
  - Each works on their branch
  - Each reports when done

Main Agent:
  - Tracks all 3
  - "Druid: 80% done, Necromancer: 50%, Engineer: 30%"
  - When all done: "All 3 units ready! Merge?"
```

## Communication Protocol

### From Sub-Agents to User (Direct Telegram)

Sub-agents use the message tool:
```javascript
message({
  action: "send",
  target: "telegram:1262038373",
  message: "📝 Starting work on [task]"
})
```

**Emoji Convention:**
- 📝 Starting work
- 💾 Commit made
- ✅ Task complete
- ❌ Error/issue
- 🧪 Testing
- 📸 Screenshot
- 🐛 Bug found
- 🔧 Fixing
- 📊 Report ready
- ⏳ Waiting

### From Sub-Agents to Main Agent

Sub-agents complete and return result object:
```javascript
{
  success: true/false,
  summary: "What was done",
  details: "...",
  artifacts: ["commit-sha", "screenshot-url"]
}
```

## Task Queue Management

Main agent maintains awareness of:
- Active sub-agents
- Queued tasks
- Completed tasks
- Task dependencies

Example state:
```
Active:
  - Coder: Implementing Lifesteal (50%)
  
Queued:
  - Tester: Verify Lifesteal (waiting for coder)
  - Coder: Add unit portraits
  
Completed:
  - Tester: Dev environment diagnostic ✅
```

## User Commands

### Status Check
```
User: "Status?"
Main Agent: Reports all active/completed tasks
```

### Interrupt/Reprioritize
```
User: "Stop the coder, I need to fix a bug first"
Main Agent: Spawns kill signal to coder, spawns bug fixer
```

### New Task
```
User: "Also add sound effects"
Main Agent: Queues or spawns immediately based on priority
```

### Ask About Running Work
```
User: "How's the Ranger perk coming?"
Main Agent: Checks with sub-agent or refers to last update
```

## Best Practices

1. **Always acknowledge** when spawning sub-agents
2. **Send updates** regularly (don't wait until end)
3. **One task per sub-agent** (parallelize)
4. **Clean up** browser tabs after testing
5. **Report failures** immediately with details
6. **Summarize** when all parallel tasks complete

## Example Session

```
[10:00 AM] German: Add a new spell: Meteor Shower
[10:00 AM] Buddy: Spawning coder agent... 📝
[10:01 AM] [Direct MSG] Coder: 📝 Starting Meteor Shower spell
[10:05 AM] German: Also fix the grid toggle button
[10:05 AM] Buddy: Queued. Current: Coder on Meteor (30%)
[10:06 AM] [Direct MSG] Coder: 💾 Commit: Add Meteor Shower AoE logic
[10:08 AM] [Direct MSG] Coder: ✅ Done! Pushed to main
[10:08 AM] Buddy: Meteor done. Spawning tester...
[10:08 AM] Buddy: Also spawning coder for grid toggle fix
[10:09 AM] [Direct MSG] Tester: 🧪 Testing Meteor Shower...
[10:09 AM] [Direct MSG] Coder 2: 🔧 Fixing grid toggle...
[10:12 AM] [Direct MSG] Tester: ✅ Test passed! 3x3 damage correct
[10:12 AM] [Direct MSG] Coder 2: ✅ Grid toggle fixed
[10:12 AM] Buddy: Both tasks complete! 🎉
[10:15 AM] German: Great, now add sound effects
[10:15 AM] Buddy: Spawning audio agent...
```

## Configuration

### Sub-Agent Spawn Template

```javascript
sessions_spawn({
  label: "unique-task-name",
  mode: "run", // or "session"
  runtime: "subagent",
  task: "Detailed instructions",
  timeoutSeconds: 300 // 5 min default
})
```

### Message to User Template

```javascript
message({
  action: "send",
  target: "telegram:1262038373", 
  message: "[emoji] Status: Details"
})
```

---

*This workflow enables continuous, parallel development with real-time visibility.*
