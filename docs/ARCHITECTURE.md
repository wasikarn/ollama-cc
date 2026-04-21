# OMO Architecture

## Overview

OMO (Ollama Model Orchestrator) is a Claude Code plugin that provides intelligent routing, multi-model consensus, and parallel execution for Ollama Cloud models.

## Design Principles

1. **Single Responsibility** — Each command does one thing well
2. **Separation of Concerns** — CLI surface vs Plugin surface are distinct
3. **Backward Compatibility** — Old command names still work as aliases
4. **Discoverability** — Command names reveal their purpose

## Command Surface

### Plugin Commands (Claude Code)

```
/ollama:route   → Intent-based model routing
/ollama:panel   → Multi-model consensus
/ollama:swarm   → Parallel workers
/ollama:jobs    → Job lifecycle
/ollama:daemon  → Daemon control
/ollama:ask     → Direct model access
/ollama:health  → System health check
```

### CLI Commands (Terminal)

```
omo route   → Auto-route
omo panel   → Consensus
omo swarm   → Parallel
omo jobs    → Jobs
omo daemon  → Daemon
omo ask     → Direct
omo health  → Health check
```

## Module Structure

```
scripts/
  omo.mjs           # Main CLI entry
  route.mjs         # Intent router
  panel.mjs         # Multi-model consensus
  swarm.mjs         # Parallel workers
  jobs.mjs          # Job management
  daemon.mjs        # Daemon control
  daemon-worker.mjs # Background worker
  lib/
    config.mjs      # Model definitions, colors, env
    daemon.mjs      # Daemon logic
    intent-router.mjs # Intent classification
    job-store.mjs   # JSON persistence
    prompt-builder.mjs # XML prompt blocks
    utils.mjs       # Shared utilities
```

## Data Flow

### Route Command

```
User Prompt → Intent Classification → Complexity Detection (optional) → Model Selection → XML Prompt Builder → ollama run
                ↓
         Confidence Score
                ↓
         Role Assignment
```

With `--vertical` flag: complexity scoring (prompt length, code presence, technical density, reasoning depth) adjusts the selected model up or down within the intent-compatible range.

### Panel Command

```
User Prompt → Parallel Model Execution (3-4 models)
                    ↓
         Agreement Score Calculation
                    ↓
         Consensus Synthesis → Output
```

### Swarm Command

```
User Spec → Worker Spawning (N workers)
                ↓
    ┌───────────┼───────────┐
    ↓           ↓           ↓
 Worker 1   Worker 2   Worker N
    ↓           ↓           ↓
    └───────────┴───────────┘
                ↓
      Result Aggregation
```

## Job Lifecycle (Ephemeral)

```
User → spawnBackground() → createJob() → queued
                                           ↓
                              spawn node background-runner.mjs <jobId>
                                           ↓
                              background-runner.mjs → executeJob() → running
                                                                         ↓
                                                           ┌───────────┴───────────┐
                                                           ↓                       ↓
                                                     markJobCompleted()     markJobFailed()
                                                           ↓                       ↓
                                                      completed               failed
                                                           ↓
                                                      Process exits
```

No persistent daemon. One-shot processes: spawn, execute, exit.

## Artifact Storage

Jobs stored in `~/.ollama-cc/jobs/*.json`:

- Job ID, type, status
- Prompt and options
- Results or error details
- Timestamps

Panel artifacts saved to `~/.omc/artifacts/ollama-cc/*.md`
Swarm artifacts saved to `~/.omc/artifacts/ollama-cc/team/*.md`

## Model Configuration

Models defined in `scripts/lib/config.mjs`:

- Model name (full Ollama identifier)
- Context size
- Best use cases
- Color coding for terminal output
- Expertise description

Intent patterns defined in `scripts/lib/intent-router.mjs`:

- Keyword patterns with regex
- Role assignments
- Confidence thresholds
- Alternative suggestions
