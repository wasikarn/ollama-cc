---
name: daemon
version: "2.0.0"
description: Show ephemeral background job status. No persistent daemon — processes spawn on demand and exit when done.
argument-hint: [--status]
---

# /ollama:daemon

Show ephemeral background execution status.

**No persistent daemon.** Background jobs run as one-shot processes: spawn, execute, exit. No idle resource usage.

## Usage

```
/ollama:daemon --status    # Check background job status
```

## Flags

| Flag       | Description                |
| ---------- | -------------------------- |
| `--status` | Show background job status |

## How Background Execution Works

Background execution uses ephemeral one-shot processes:

```bash
# Spawn a background job — process starts, runs, then exits
/ollama:panel --detach "Analyze codebase"
# Output: Job abc123 spawned (PID: 12345)

# Check all jobs
/ollama:jobs

# Check background status
/ollama:daemon --status
```

**vs Persistent Daemon:**

| Aspect      | Old (Daemon)       | New (Ephemeral)    |
| ----------- | ------------------ | ------------------ |
| Lifecycle   | Start → Run → Stop | Spawn → Run → Exit |
| Idle Cost   | Always running     | Zero               |
| Reliability | PID file, signals  | Simple spawn/unref |
| Complexity  | Daemon worker loop | One-shot process   |

## Execution

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/daemon.mjs {{flags}}
```
