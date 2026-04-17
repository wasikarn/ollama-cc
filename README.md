# Ollama CC

Intelligent Ollama cloud model orchestration for Claude Code.

## Features

- **Smart Router (Phase 1)**: Auto-detect best model from prompt keywords
- **Debate Mode (Phase 2)**: Multi-model consensus with quality tiers
- **Team Mode (Phase 3)**: Parallel workers with ensemble voting

## Installation

```bash
# Add to Claude Code plugins
/plugin marketplace add ollama-cc
/plugin install ollama-cc
```

## Commands

### Smart Router

```bash
# Auto-route to best model
/ollama:smart "debug why this async fails"
/ollama:smart --explain "refactor this code"
```

### Debate Mode

```bash
# Multi-model consensus
/ollama:debate "Should we use event sourcing?"
/ollama:debate --tier deep "architecture decision"
```

### Team Mode

```bash
# Parallel workers
/ollama:team 3:kimi "analyze file-{i}.ts"
/ollama:team 5:gemma "refactor" --ensemble
```

## Model Specifications

| Model | Context | Best For |
|-------|---------|----------|
| `kimi-k2.5:cloud` | 256K | Multimodal, UI→code, reasoning |
| `glm-5.1:cloud` | ~200K | Coding SOTA, agentic debugging |
| `gemma4:31b-cloud` | 256K | OCR, document parsing, refactoring |

## Architecture

See [docs/PROPOSAL-v2.md](docs/PROPOSAL-v2.md) for full design.

## License

MIT