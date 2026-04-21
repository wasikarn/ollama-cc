# Ollama Model Orchestrator (OMO)

Ollama cloud models with intelligent routing, multi-model consensus, and parallel worker execution.

## Features

- **Route** — Intent-based model detection with keyword fallback
- **Panel** — Multi-model consensus with quality tiers and JSON output
- **Swarm** — Parallel workers with ensemble voting
- **Jobs** — Persistent job store with status tracking
- **Daemon** — Background execution management
- **Structured Output** — JSON schema output for machine parsing

## Prerequisites

**Required**: Ollama CLI with cloud models access

```bash
# Install Ollama CLI
npm install -g ollama

# Sign in to Ollama cloud (required before using this plugin)
ollama signin
```

## Installation

```bash
# Add to Claude Code plugins
/plugin marketplace add ollama-cc
/plugin install ollama-cc
```

Or install manually:

```bash
# Clone to Claude Code plugins directory
git clone https://github.com/wasikarn/ollama-cc ~/.claude/plugins/ollama-cc
/plugin install ollama-cc
```

## Commands

### Route (Smart Router)

Auto-route prompts to the best model using intent classification:

```bash
# Auto-route based on intent
/ollama:route "debug why this async fails"
/ollama:route --explain "refactor this code"

# Show intent classification
/ollama:route --show-intent "design a caching layer"

# Direct model access
/ollama:route --model kimi "analyze this screenshot"
/ollama:route --model glm "design microservices"
/ollama:route --model gemma "extract text from PDF"
```

**Intent Routing:**
| Intent | Patterns | Routes To | Role |
|--------|----------|-----------|------|
| DEBUG | debug, error, fix, crash, exception | glm-5.1 | investigator |
| IMPLEMENT | code, implement, write function | glm-5.1 | executor |
| REVIEW | review, analyze, check, audit | glm-5.1 | reviewer |
| DESIGN | design, architecture, pattern | glm-5.1 | architect |
| EXPLAIN | explain, how does, what is | kimi | educator |
| REFACTOR | refactor, transform, migrate | gemma4 | refactorer |
| DOCUMENT | ocr, document, parse, extract | gemma4 | documenter |
| VISUAL | ui, visual, screenshot, mockup | kimi | designer |
| TEST | test, spec, unit test, coverage | glm-5.1 | tester |

### Panel Mode (Multi-Model Consensus)

Run 3 models in parallel with structured output:

```bash
# Multi-model consensus (default: standard tier)
/ollama:panel "Should we use event sourcing?"

# Fast tier (consensus ≥90% only)
/ollama:panel --tier fast "Is this function pure?"

# Deep tier with full analysis
/ollama:panel --tier deep "Architecture decision with risks"

# JSON output for automation
/ollama:panel --format json "Security review this code"

# Run in background
/ollama:panel --detach --tier deep "Complex analysis"
```

### Swarm Mode (Parallel Workers)

Execute tasks in parallel with multiple workers:

```bash
# Distribute: 3 workers analyze different files
/ollama:swarm 3:kimi "analyze src/utils-{i}.ts"

# Ensemble: 5 workers vote on same task
/ollama:swarm 5:gemma "Review this PR" --ensemble

# Process many files
/ollama:swarm 10:glm "extract functions from file-{0}.js"

# JSON output
/ollama:swarm 3:kimi "analyze file-{i}.ts" --format json

# Background execution
/ollama:swarm 10:glm "refactor module-{i}" --detach
```

**Task Templates:**

- `{i}` = 1-indexed (1, 2, 3...)
- `{0}` = 0-indexed (0, 1, 2...)
- `{n}` = total count

### Jobs Command

Check job status:

```bash
# Show all jobs
/ollama:jobs

# Filter by status
/ollama:jobs --running
/ollama:jobs --completed
/ollama:jobs --failed
/ollama:jobs --pending

# Show detailed job info
/ollama:jobs <job-id>

# Statistics
/ollama:jobs --stats

# Cleanup old jobs (7 days)
/ollama:jobs --cleanup
```

### Daemon Control

Manage the background execution daemon:

```bash
# Start daemon
/ollama:daemon --start

# Stop daemon
/ollama:daemon --stop

# Check daemon status
/ollama:daemon --status
```

The daemon enables background execution via `--detach` flag:

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

## Model Specifications

All models are included with your Ollama Cloud subscription.

| Model                | Context | Best For                                     | Included |
| -------------------- | ------- | -------------------------------------------- | -------- |
| `kimi-k2.6:cloud`    | 256K    | Multimodal, UI→code, agentic workflows       | Yes      |
| `glm-5.1:cloud`      | ~200K   | Coding, agentic engineering, SWE-Bench Pro   | Yes      |
| `gemma4:31b-cloud`   | 256K    | OCR, document parsing, refactoring           | Yes      |
| `qwen3.5:397b-cloud` | 256K    | Reasoning, coding, 201 languages, multimodal | Yes      |

**Note:** Ollama Cloud uses subscription pricing (Free/Pro/Max tiers). Usage is measured by GPU time, not tokens. See [Ollama Cloud Pricing](https://ollama.com/cloud) for details.

## Configuration

Create `~/.ollama-cli/config.json` for custom defaults:

```json
{
  "default_model": "kimi-k2.6:cloud",
  "temperature": "0.1",
  "code_model": "glm-5.1:cloud",
  "review_model": "gemma4:31b-cloud"
}
```

## Troubleshooting

### "ollama: command not found"

```bash
npm install -g ollama
ollama signin
```

### "Authentication failed" or "401 Unauthorized"

```bash
# Re-authenticate
ollama signin
```

### "Model not found" or timeout

- Check internet connection
- Verify `ollama signin` completed successfully
- Try with explicit model: `/ollama:route --model kimi "prompt"`
- Check job status: `/ollama:jobs --failed`

### Slow responses

- Use `kimi-k2.6:cloud` (often fastest, included with subscription)
- For bulk tasks, use Swarm Mode with `--detach` for background execution
- Check daemon status: `/ollama:daemon --status`

### Commands not appearing

```bash
# Reload plugins
/reload-plugins

# Verify plugin installed
/plugin list
```

### Background jobs not completing

```bash
# Check daemon is running
/ollama:daemon --status

# Start daemon if needed
/ollama:daemon --start

# Check failed jobs
/ollama:jobs --failed
```

## CLI Usage (Standalone)

Use without Claude Code:

```bash
# Direct execution
./ollama-wrapper.sh route "debug this error"
./ollama-wrapper.sh route --show-intent "design this"
./ollama-wrapper.sh panel "architecture decision"
./ollama-wrapper.sh panel --format json "security review"
./ollama-wrapper.sh swarm 3:kimi "analyze file-{i}.ts"
./ollama-wrapper.sh swarm 10:glm "refactor" --detach

# Job management
./ollama-wrapper.sh jobs
./ollama-wrapper.sh jobs --running
./ollama-wrapper.sh daemon --start
./ollama-wrapper.sh daemon --stop
```

Or install globally:

```bash
npm install -g .
# Now use:
omo route "debug this"
omo panel "review this"
omo swarm 3:kimi "task"
omo jobs --running
omo daemon --start
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full design.

## Changelog

See [docs/CHANGELOG.md](docs/CHANGELOG.md).

## License

MIT
