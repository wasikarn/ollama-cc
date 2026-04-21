---
name: daemon
version: "1.0.0"
description: Control the background execution daemon. Start, stop, and check daemon status for detached job processing.
argument-hint: [--start] [--stop] [--status]
---

# /ollama:daemon

Control the background execution daemon for detached job processing.

## Usage

```
/ollama:daemon --start     # Start the daemon
/ollama:daemon --stop      # Stop the daemon
/ollama:daemon --status    # Check daemon status
```

## Flags

| Flag       | Description                 |
| ---------- | --------------------------- |
| `--start`  | Start the background daemon |
| `--stop`   | Stop the background daemon  |
| `--status` | Show daemon status only     |

## Daemon Management

The daemon enables background execution via `--detach` flag on panel and swarm commands:

```bash
# Start daemon
/ollama:daemon --start

# Submit background job
/ollama:panel --detach "Analyze codebase"

# Check job status
/ollama:jobs --running

# Stop daemon when done
/ollama:daemon --stop
```

## Execution

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/daemon.mjs {{flags}}
```
