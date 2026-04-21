# Ollama CC

Ollama cloud models with intelligent routing, job lifecycle management, and background execution.

## Features

- **Smart Router (Phase 1)**: Intent-based model detection with keyword fallback
- **Debate Mode (Phase 2)**: Multi-model consensus with quality tiers and JSON output
- **Team Mode (Phase 3)**: Parallel workers with ensemble voting
- **Job Management (v0.1.0)**: Persistent job store with status tracking
- **Background Execution (v0.2.0)**: Daemon-based detached execution
- **Structured Output (v0.2.0)**: JSON schema output for machine parsing

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

### Smart Router

Auto-route prompts to the best model using intent classification:

```bash
# Auto-route based on intent
/ollama:smart "debug why this async fails"
/ollama:smart --explain "refactor this code"

# Show intent classification
/ollama:smart --show-intent "design a caching layer"

# Direct model access
/ollama:smart --model kimi "analyze this screenshot"
/ollama:smart --model glm "design microservices"
/ollama:smart --model gemma "extract text from PDF"
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

### Debate Mode

Run 3 models in parallel with structured output:

```bash
# Multi-model consensus (default: standard tier)
/ollama:debate "Should we use event sourcing?"

# Fast tier (consensus ≥90% only)
/ollama:debate --tier fast "Is this function pure?"

# Deep tier with full analysis
/ollama:debate --tier deep "Architecture decision with risks"

# JSON output for automation
/ollama:debate --format json "Security review this code"

# Run in background
/ollama:debate --detach --tier deep "Complex analysis"
```

### Team Mode

Execute tasks in parallel with multiple workers:

```bash
# Distribute: 3 workers analyze different files
/ollama:team 3:kimi "analyze src/utils-{i}.ts"

# Ensemble: 5 workers vote on same task
/ollama:team 5:gemma "Review this PR" --ensemble

# Process many files
/ollama:team 10:glm "extract functions from file-{0}.js"

# JSON output
/ollama:team 3:kimi "analyze file-{i}.ts" --format json

# Background execution
/ollama:team 10:glm "refactor module-{i}" --detach
```

**Task Templates:**

- `{i}` = 1-indexed (1, 2, 3...)
- `{0}` = 0-indexed (0, 1, 2...)
- `{n}` = total count

### Status Command

Check jobs and daemon status:

```bash
# Show all jobs and daemon status
/ollama:status

# Filter by status
/ollama:status --running
/ollama:status --completed
/ollama:status --failed
/ollama:status --pending

# Show detailed job info
/ollama:status <job-id>

# Daemon control
/ollama:status --start
/ollama:status --stop
/ollama:status --daemon

# Statistics
/ollama:status --stats

# Cleanup old jobs (7 days)
/ollama:status --cleanup
```

## Model Specifications

All models are included with your Ollama Cloud subscription.

| Model                | Context | Best For                                             | Included |
| -------------------- | ------- | ---------------------------------------------------- | -------- |
| `kimi-k2.6:cloud`    | 256K    | Multimodal, UI→code, reasoning                       | Yes      |
| `glm-5.1:cloud`      | ~200K   | Coding SOTA, agentic debugging                       | Yes      |
| `gemma4:31b-cloud`   | 256K    | OCR, document parsing, refactoring                   | Yes      |
| `qwen3.5:397b-cloud` | 1M/262K | Ultra-long context, massive documents, 201 languages | Yes      |

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
- Try with explicit model: `/ollama:smart --model kimi "prompt"`
- Check job status: `/ollama:status --failed`

### Slow responses

- Use `kimi-k2.6:cloud` (often fastest, included with subscription)
- For bulk tasks, use Team Mode with `--detach` for background execution
- Check daemon status: `/ollama:status --daemon`

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
/ollama:status --daemon

# Start daemon if needed
/ollama:status --start

# Check failed jobs
/ollama:status --failed
```

## Workflow Examples

### Complete Background Analysis Workflow

```bash
# 1. Start daemon
/ollama:status --start

# 2. Submit long-running analysis to background
/ollama:debate --detach --tier deep "Review microservices architecture"
# Output: Job submitted: abc123-def456

# 3. Continue working...

# 4. Check status later
/ollama:status --running
/ollama:status abc123-def456

# 5. Stop daemon when done
/ollama:status --stop
```

### Batch Refactoring with Team Mode

```bash
# Refactor 20 files in background
/ollama:team 20:gemma "refactor src/components/File-{i}.ts to use hooks" --detach

# Check progress
/ollama:status --stats
# Output: Running: 15/20 | Completed: 3 | Failed: 2

# View failed jobs
/ollama:status --failed

# Re-run failed ones
/ollama:status <failed-job-id>  # Get original prompt
/ollama:team 2:gemma "<original prompt>" --detach
```

### CI/CD Integration with JSON Output

```bash
# Security review in CI pipeline
./ollama-wrapper.sh debate --format json --tier fast "Security review this PR" > review.json

# Parse result
VERDICT=$(jq -r '.verdict' review.json)
CONFIDENCE=$(jq -r '.confidence' review.json)

if [ "$VERDICT" = "low" ] && [ $(echo "$CONFIDENCE < 0.5" | bc) -eq 1 ]; then
  echo "High uncertainty - require manual review"
  exit 1
fi
```

### Complex Multi-Step Analysis

```bash
# Step 1: Get consensus on approach
/ollama:debate --tier deep "Should we use CQRS for this service?"
# Result: Proceed with cautious implementation

# Step 2: Design with multiple perspectives
/ollama:team 3:glm "Design {i} alternative architectures" --ensemble

# Step 3: Implement chosen approach
/ollama:smart --model glm-5.1 "Implement the CQRS pattern with event sourcing"

# Step 4: Generate tests
/ollama:smart --show-intent "Write comprehensive tests for CQRS implementation"
```

## CLI Usage (Standalone)

Use without Claude Code:

```bash
# Direct execution
./ollama-wrapper.sh smart "debug this error"
./ollama-wrapper.sh smart --show-intent "design this"
./ollama-wrapper.sh debate "architecture decision"
./ollama-wrapper.sh debate --format json "security review"
./ollama-wrapper.sh team 3:kimi "analyze file-{i}.ts"
./ollama-wrapper.sh team 10:glm "refactor" --detach

# Job management
./ollama-wrapper.sh status
./ollama-wrapper.sh status --running
./ollama-wrapper.sh status --start
./ollama-wrapper.sh status --stop
```

## Architecture

See [docs/PROPOSAL-v2.md](docs/PROPOSAL-v2.md) for full design.

## Changelog

### v0.1.0

- Intent-based routing with role classification
- Job lifecycle management with JSON persistence
- Structured JSON output (`--format json`)
- Background execution with daemon (`--detach`)
- Status command for job monitoring
- Retry logic with exponential backoff
- XML prompt block system

## License

MIT
