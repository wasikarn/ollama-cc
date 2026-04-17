# Ollama CC

Intelligent Ollama cloud model orchestration for Claude Code.

## Features

- **Smart Router (Phase 1)**: Auto-detect best model from prompt keywords
- **Debate Mode (Phase 2)**: Multi-model consensus with quality tiers
- **Team Mode (Phase 3)**: Parallel workers with ensemble voting

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

Auto-route prompts to the best model based on keywords:

```bash
# Auto-route to best model
/ollama:smart "debug why this async fails"
/ollama:smart --explain "refactor this code"

# Direct model access
/ollama:smart --model kimi "analyze this screenshot"
/ollama:smart --model glm "design microservices"
/ollama:smart --model gemma "extract text from PDF"
```

**Routing Logic:**
| Keywords | Routes To |
|----------|-----------|
| debug, error, fix | glm-5.1 |
| design, architecture | glm-5.1 |
| refactor, transform | gemma4 |
| ui, visual, screenshot | kimi |
| ocr, document, extract | gemma4 |

### Debate Mode

Run 3 models in parallel and synthesize consensus:

```bash
# Multi-model consensus (default: standard tier)
/ollama:debate "Should we use event sourcing?"

# Fast tier (consensus ≥90% only)
/ollama:debate --tier fast "Is this function pure?"

# Deep tier (full analysis + trade-offs)
/ollama:debate --tier deep "Architecture decision with risks"
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
```

**Task Templates:**
- `{i}` = 1-indexed (1, 2, 3...)
- `{0}` = 0-indexed (0, 1, 2...)
- `{n}` = total count

## Model Specifications

| Model | Context | Best For | Cost |
|-------|---------|----------|------|
| `kimi-k2.5:cloud` | 256K | Multimodal, UI→code, reasoning | **FREE** |
| `glm-5.1:cloud` | ~200K | Coding SOTA, agentic debugging | Standard |
| `gemma4:31b-cloud` | 256K | OCR, document parsing, refactoring | Standard |

## Configuration

Create `~/.ollama-cli/config.json` for custom defaults:

```json
{
  "default_model": "kimi-k2.5:cloud",
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

### Slow responses
- Use `kimi-k2.5:cloud` (FREE tier, often fastest)
- For bulk tasks, use Team Mode with multiple workers
- Check Ollama status: `ollama status`

### Commands not appearing
```bash
# Reload plugins
/reload-plugins

# Verify plugin installed
/plugin list
```

## CLI Usage (Standalone)

Use without Claude Code:

```bash
# Direct execution
./ollama-wrapper.sh smart "debug this error"
./ollama-wrapper.sh debate "architecture decision"
./ollama-wrapper.sh team 3:kimi "analyze file-{i}.ts"
```

## Architecture

See [docs/PROPOSAL-v2.md](docs/PROPOSAL-v2.md) for full design.

## License

MIT
