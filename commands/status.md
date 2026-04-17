---
name: status
description: Check job status and manage the background execution daemon. View running, completed, and failed jobs with detailed output.
argument-hint: [job-id] [--daemon] [--stats] [--running] [--completed] [--failed] [--pending] [--start] [--stop] [--cleanup]
---

# /ollama:status

Check job status and manage the background execution daemon.

## Usage

```
/ollama:status                    # Show all jobs and daemon status
/ollama:status <job-id>           # Show detailed job info
/ollama:status --daemon           # Show daemon status only
/ollama:status --stats            # Show job statistics
/ollama:status --running           # List running jobs
/ollama:status --completed         # List completed jobs
/ollama:status --failed           # List failed jobs
/ollama:status --pending           # List pending jobs
/ollama:status --start            # Start daemon
/ollama:status --stop             # Stop daemon
/ollama:status --cleanup          # Clean up old jobs (7 days)
```

## Flags

| Flag | Description |
|------|-------------|
| `--daemon` | Show daemon status only |
| `--stats` | Show job statistics summary |
| `--running` | Filter: running jobs only |
| `--completed` | Filter: completed jobs only |
| `--failed` | Filter: failed jobs only |
| `--pending` | Filter: pending jobs only |
| `--start` | Start the background daemon |
| `--stop` | Stop the background daemon |
| `--cleanup` | Remove jobs older than 7 days |

## Job States

| Status | Icon | Description |
|--------|------|-------------|
| pending | ○ | Job created, waiting to start |
| running | ⟳ | Job actively executing |
| completed | ✓ | Job finished successfully |
| failed | ✗ | Job failed with error |

## Examples

```bash
# Check overall status
/ollama:status

# View specific job details
/ollama:status abc123-def456

# Check what's running
/ollama:status --running

# View daemon status
/ollama:status --daemon

# Start daemon for background execution
/ollama:status --start

# Stop daemon
/ollama:status --stop

# Clean up old jobs
/ollama:status --cleanup
```

## Daemon Management

The daemon enables background execution via `--detach` flag:

```bash
# Start daemon
/ollama:status --start

# Submit background job
/ollama:debate --detach "Analyze codebase"

# Check job status
/ollama:status --running

# Stop daemon when done
/ollama:status --stop
```

## Job Storage

Jobs are stored in `~/.ollama-cc/jobs/` as JSON files with metadata:
- Job ID, type, status
- Prompt and options
- Results or error details
- Timestamps (created, updated, completed)

## Execution

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/status.mjs {{#if job-id}}"{{job-id}}"{{/if}} {{flags}}
```
