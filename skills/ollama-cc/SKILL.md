---
name: ollama-cc
version: "1.0.0"
description: Run Ollama cloud models (kimi, glm, gemma) with intelligent routing. Use when user wants LLM inference, code generation/review, or auto-routing to best model. Trigger on "ollama", "kimi", "glm", "gemma", "run model", "smart route".
triggers:
  - ollama
  - kimi
  - glm
  - gemma
  - run model
  - smart route
  - ollama code
  - ollama review
  - auto-select model
---

# Ollama CC Skill

Run Ollama cloud models with intelligent auto-routing. Wrapper script detects task type and routes to the best model automatically.

## IMPORTANT: Usage via Wrapper

This skill provides documentation. To execute commands, use the wrapper script:

```bash
./ollama-wrapper.sh <command> [args...]
```

Or ask Claude to run ollama commands for you.

## Quick Start

```bash
# Smart auto-routing (recommended)
./ollama-wrapper.sh smart "debug this error"              # Routes to GLM-5.1
./ollama-wrapper.sh smart "refactor this code"            # Routes to Gemma 4
./ollama-wrapper.sh smart --explain "extract from PDF"    # Shows routing decision

# Direct model access
./ollama-wrapper.sh kimi "prompt"          # Kimi K2.5 (multimodal)
./ollama-wrapper.sh glm "prompt"           # GLM-5.1 (coding, agentic)
./ollama-wrapper.sh gemma "prompt"        # Gemma 4 (OCR, refactoring)

# Check status
./ollama-wrapper.sh status
```

## Smart Router (Phase 1)

Auto-detects the best model based on keywords in your prompt:

| Keywords | Routes To | Why |
|----------|-----------|-----|
| `debug`, `error`, `fix`, `trace` | **GLM-5.1** | SWE-Bench Pro SOTA, agentic debugging |
| `design`, `architecture`, `system` | **GLM-5.1** | 754B MoE, 8-hour agent support |
| `OCR`, `document`, `parse`, `PDF` | **Gemma 4** | Native OCR, 256K context |
| `UI`, `visual`, `screenshot`, `image` | **Kimi K2.5** | Cross-modal, UI→code |
| `refactor`, `transform`, `rename` | **Gemma 4** | Fast, native function calling |
| *(default)* | **Kimi K2.5** | Balanced, FREE, 256K context |

**Usage:**
```bash
./ollama-wrapper.sh smart "your prompt here"
./ollama-wrapper.sh smart --explain "your prompt"    # Shows why it routed there
```

## Commands

| Command | Description |
|---------|-------------|
| `smart "<prompt>"` | **Auto-detect best model** (recommended) |
| `smart --explain "<p>"` | Show routing decision |
| `kimi "<p>"` | Kimi K2.5 (:cloud) |
| `glm "<p>"` | GLM-5.1 (:cloud) |
| `gemma "<p>"` | Gemma 4 31B (:cloud) |
| `run "<p>"` | Default model execution |
| `code "<p>"` | Code generation (temp=0.1) |
| `review <file> [focus]` | Code review |
| `think "<p>"` | Extended reasoning |
| `preload [model]` | Warm model |
| `ps` | Show loaded models |
| `status` | Full status |
| `help` | Show help |

## Examples

```bash
# Smart routing (auto-detect)
./ollama-wrapper.sh smart "debug why this async fails"
./ollama-wrapper.sh smart "refactor to use repository pattern"
./ollama-wrapper.sh smart "extract text from this PDF"
./ollama-wrapper.sh smart "convert this UI to React"

# Direct model shortcuts
./ollama-wrapper.sh glm code "Write a Python LRU cache"
./ollama-wrapper.sh kimi think "Design distributed system"
./ollama-wrapper.sh gemma run "Summarize this document"

# Code review
./ollama-wrapper.sh smart "review src/auth.ts" security
./ollama-wrapper.sh smart "review src/db.ts" performance
```

## Model Specifications

See [references/models.md](references/models.md) for detailed specs.

| Model | Context | Best For | Cost |
|-------|---------|----------|------|
| `kimi-k2.5:cloud` | **256K** | Multimodal, UI→code | **FREE** |
| `glm-5.1:cloud` | ~200K | Coding, agentic tasks | $1/M |
| `gemma4:31b-cloud` | **256K** | OCR, refactoring | $0.14/M |

## Setup

```bash
# One-time login
ollama signin

# Verify cloud models available
ollama list
```

## Optimized Environment Variables

Set in your shell profile (~/.zshrc):

```bash
# Keep models loaded (1 hour vs 5 min default)
export OLLAMA_KEEP_ALIVE=1h

# 4 concurrent sequences
export OLLAMA_NUM_PARALLEL=4

# Enable flash attention (20% VRAM reduction)
export OLLAMA_FLASH_ATTENTION=1

# Limit concurrent models
export OLLAMA_MAX_LOADED_MODELS=2
```

## Config File

`~/.ollama-cli/config.json`:
```json
{
  "default_model": "kimi-k2.5:cloud",
  "temperature": "0.1",
  "code_model": "glm-5.1:cloud",
  "review_model": "glm-5.1:cloud"
}
```

## Performance Tips

1. **Use `smart`**: Auto-routes to best model for the task
2. **Preload models**: `./ollama-wrapper.sh preload glm-5.1:cloud`
3. **JSON mode**: Use `run-json` for structured data
4. **Flash Attention**: Set `OLLAMA_FLASH_ATTENTION=1`

## Review Focus Types

| Focus | Detects |
|-------|---------|
| `general` | Bugs, best practices |
| `security` | Injection, XSS, secrets |
| `performance` | O(n²), N+1 queries, leaks |

## Sources

- [Ollama CLI Reference](https://docs.ollama.com/cli)
- [Ollama Cloud Models](https://docs.ollama.com/cloud)
- [Claude Code Integration](https://docs.ollama.com/integrations/claude-code)
- [Kimi K2.5](https://ollama.com/library/kimi-k2.5)
- [GLM-5.1](https://ollama.com/library/glm-5.1)
- [Gemma 4](https://ollama.com/library/gemma4)
