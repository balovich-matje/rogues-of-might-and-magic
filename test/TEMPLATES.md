# Reusable Sub-Agent Templates

## Coder Agent Template

```javascript
sessions_spawn({
  label: "coder-[feature-name]",
  mode: "run",
  runtime: "subagent",
  task: `Implement [FEATURE] for Steel and Sigils.

TASK:
[Detailed description of what to implement]

REQUIREMENTS:
- Edit files in /Users/germanhripkov/repos/steel-and-sigils/
- Follow existing code patterns
- Test changes work (manual verification OK)
- Commit with descriptive message
- Push to main branch

SEND UPDATES TO USER:
Use message tool to telegram:1262038373 at each step:
1. "📝 Starting implementation of [FEATURE]"
2. "💾 Commit: [commit message]" (after each commit)
3. "✅ [FEATURE] complete! Pushed to GitHub"
4. If error: "❌ Error: [description]"

COMPLETION:
Return summary of what was done and any notes.`,
  timeoutSeconds: 600
})
```

## Tester Agent Template

```javascript
sessions_spawn({
  label: "tester-[feature-name]",
  mode: "run",
  runtime: "subagent",
  task: `Test [FEATURE] in Steel and Sigils dev environment.

SETUP:
1. Open browser at http://127.0.0.1:5500/test/dev.html
2. Ensure browser relay is attached (wait for user if needed)

TEST SCENARIOS:
[List specific test cases]

SEND UPDATES TO USER:
Use message tool to telegram:1262038373:
1. "🧪 Opening dev environment for [FEATURE] testing"
2. "📸 Screenshot: [description]" (at key states)
3. "✅ [Test case] passed"
4. "❌ Issue: [description + error]"

COMPLETION:
Return full test report with pass/fail status and screenshots.`,
  timeoutSeconds: 300
})
```

## Reporter Agent Template

```javascript
sessions_spawn({
  label: "reporter-[task-name]",
  mode: "run",
  runtime: "subagent",
  task: `Report progress on [LONG-RUNNING-TASK].

SEND UPDATES TO USER:
Every 2 minutes, send message to telegram:1262038373:
- Current status
- Progress percentage if available
- Any blockers

UPDATE MESSAGES:
1. "⏳ [Task]: Starting..."
2. "⏳ [Task]: 25% complete..."
3. "⏳ [Task]: 50% complete..."
4. "✅ [Task]: Complete!"

COMPLETION:
Return final summary.`,
  timeoutSeconds: 600
})
```

## Quick Spawn Commands

### Spawn Coder
```javascript
spawnCoder("feature-name", "Implement X that does Y", ["file1.js", "file2.js"])
```

### Spawn Tester
```javascript
spawnTester("feature-name", "Test X functionality", ["scenario1", "scenario2"])
```

### Spawn Reporter
```javascript
spawnReporter("task-name", "Progress updates every 2 min")
```

## Helper Functions (for main agent)

```javascript
// Track active sub-agents
const activeAgents = new Map();

function spawnCoder(label, task, files) {
  const agent = sessions_spawn({
    label: `coder-${label}`,
    mode: "run",
    runtime: "subagent",
    task: `Implement ${task}\n\nFiles to edit: ${files.join(', ')}\n\nSend updates via message to telegram:1262038373`,
    timeoutSeconds: 600
  });
  activeAgents.set(label, { type: 'coder', agent, startTime: Date.now() });
  return agent;
}

function spawnTester(label, task, scenarios) {
  const agent = sessions_spawn({
    label: `tester-${label}`,
    mode: "run",
    runtime: "subagent",
    task: `Test ${task}\n\nScenarios: ${scenarios.join(', ')}\n\nSend updates via message to telegram:1262038373`,
    timeoutSeconds: 300
  });
  activeAgents.set(label, { type: 'tester', agent, startTime: Date.now() });
  return agent;
}

function getStatus() {
  const status = [];
  for (const [label, info] of activeAgents) {
    const elapsed = Math.floor((Date.now() - info.startTime) / 1000);
    status.push(`${label} (${info.type}): ${elapsed}s elapsed`);
  }
  return status.join('\n') || 'No active agents';
}
```

## Message Templates for Sub-Agents

### Progress Messages
```javascript
// Starting
message({ action: "send", target: "telegram:1262038373", message: "📝 Starting: [task]" })

// Progress
message({ action: "send", target: "telegram:1262038373", message: "⏳ [task]: 50% complete" })

// Commit
message({ action: "send", target: "telegram:1262038373", message: "💾 Commit: [message]" })

// Success
message({ action: "send", target: "telegram:1262038373", message: "✅ [task] complete!" })

// Error
message({ action: "send", target: "telegram:1262038373", message: "❌ Error in [task]: [details]" })

// Screenshot
message({ action: "send", target: "telegram:1262038373", message: "📸 Screenshot: [description]" })
```
