---
name: jobs
version: "1.0.0"
description: Check job status and manage the background execution daemon. View running, completed, and failed jobs with detailed output.
argument-hint: [job-id] [--stats] [--running] [--completed] [--failed] [--pending] [--cleanup]
---

# /ollama:jobs

Check job status and manage background execution history.

## Usage

```
/ollama:jobs                    # Show all jobs
/ollama:jobs <job-id>           # Show detailed job info
/ollama:jobs --stats            # Show job statistics
/ollama:jobs --running           # List running jobs
/ollama:jobs --completed         # List completed jobs
/ollama:jobs --failed           # List failed jobs
/ollama:jobs --pending           # List pending jobs
/ollama:jobs --cleanup          # Clean up old jobs (7 days)
```

## Flags

| Flag          | Description                   |
| ------------- | ----------------------------- |
| `--stats`     | Show job statistics summary   |
| `--running`   | Filter: running jobs only     |
| `--completed` | Filter: completed jobs only   |
| `--failed`    | Filter: failed jobs only      |
| `--pending`   | Filter: pending jobs only     |
| `--cleanup`   | Remove jobs older than 7 days |

## Job States

| Status    | Icon | Description                   |
| --------- | ---- | ----------------------------- |
| pending   | ○    | Job created, waiting to start |
| running   | ⟳    | Job actively executing        |
| completed | ✓    | Job finished successfully     |
| failed    | ✗    | Job failed with error         |

## Examples

```bash
# Check all jobs
/ollama:jobs

# View specific job details
/ollama:jobs abc123-def456

# Check what's running
/ollama:jobs --running

# View statistics
/ollama:jobs --stats

# Clean up old jobs
/ollama:jobs --cleanup
```

## Job Storage

Jobs are stored in `~/.ollama-cc/jobs/` as JSON files with metadata:

- Job ID, type, status
- Prompt and options
- Results or error details
- Timestamps (created, updated, completed)

## Execution

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/jobs.mjs {{#if job-id}}"{{job-id}}"{{/if}} {{flags}}
```
