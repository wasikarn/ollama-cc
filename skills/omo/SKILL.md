---
name: omo
type: prompt
description: Multi-model orchestration with smart routing, panel consensus, and swarm parallel execution. Use this skill whenever the user mentions Ollama, multiple models, parallel execution, smart routing, model selection, panel mode, consensus voting, or comparing model outputs. Also trigger when the user wants automatic model selection, distributed tasks across workers, or ensemble voting. For SINGLE specific model access, use ask-kimi/ask-glm/ask-gemma/ask-qwen instead.
triggers:
  - omo
  - ollama orchestrator
  - smart route
  - auto-route
  - panel mode
  - swarm mode
  - multi-model
  - consensus
  - parallel models
  - ollama code
  - ollama review
  - run multiple models
  - compare models
  - model ensemble
  - distribute tasks
  - route to best model
---

# OMO — Ollama Model Orchestrator

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
./ollama-wrapper.sh route "debug this error"              # Routes to GLM-5.1
./ollama-wrapper.sh route "refactor this code"            # Routes to Gemma 4
./ollama-wrapper.sh route --explain "extract from PDF"    # Shows routing decision

# Direct model access
./ollama-wrapper.sh ask kimi "prompt"    # Kimi K2.6 (multimodal)
./ollama-wrapper.sh ask glm "prompt"     # GLM-5.1 (coding, agentic)
./ollama-wrapper.sh ask gemma "prompt"   # Gemma 4 (OCR, refactoring)
./ollama-wrapper.sh ask qwen "prompt"    # Qwen 3.5 397B (reasoning, 201 languages)

# Multi-model panel (consensus)
./ollama-wrapper.sh panel "Should we use microservices?"
./ollama-wrapper.sh panel --tier deep "Architecture decision"

# Parallel swarm execution
./ollama-wrapper.sh swarm 3:kimi "analyze file-{i}.ts"
./ollama-wrapper.sh swarm 5:gemma "Review PR" --ensemble

# Job management
./ollama-wrapper.sh jobs
./ollama-wrapper.sh daemon --start
```

## Smart Router

Auto-detects the best model based on keywords in your prompt:

| Keywords                              | Routes To     | Why                                    |
| ------------------------------------- | ------------- | -------------------------------------- |
| `debug`, `error`, `fix`, `trace`      | **GLM-5.1**   | SWE-Bench Pro 58.4%, agentic debugging |
| `design`, `architecture`, `system`    | **GLM-5.1**   | NL2Repo, Terminal-Bench 2.0            |
| `OCR`, `document`, `parse`, `PDF`     | **Gemma 4**   | Native OCR, 256K context               |
| `UI`, `visual`, `screenshot`, `image` | **Kimi K2.6** | Cross-modal, UI→code                   |
| `refactor`, `transform`, `rename`     | **Gemma 4**   | Fast, native function calling          |
| `complex reasoning`, `math`, `logic`  | **Qwen 3.5**  | AIME26 91.3%, MathVision 88.6%         |
| `multilingual`, `translate`           | **Qwen 3.5**  | 201 languages supported                |
| _(default)_                           | **Kimi K2.6** | Balanced, 256K context                 |

**Usage:**

```bash
./ollama-wrapper.sh route "your prompt here"
./ollama-wrapper.sh route --explain "your prompt"    # Shows why it routed there
```

## Commands

| Command                  | Description                              |
| ------------------------ | ---------------------------------------- |
| `route "<prompt>"`       | **Auto-detect best model** (recommended) |
| `route --explain "<p>"`  | Show routing decision                    |
| `ask kimi "<p>"`         | Kimi K2.6 (:cloud)                       |
| `ask glm "<p>"`          | GLM-5.1 (:cloud)                         |
| `ask gemma "<p>"`        | Gemma 4 31B (:cloud)                     |
| `ask qwen "<p>"`         | Qwen 3.5 397B (:cloud)                   |
| `panel "<p>"`            | Multi-model consensus                    |
| `panel --tier <tier>`    | Quality tier (fast/standard/deep)        |
| `swarm N:model "<task>"` | Parallel workers                         |
| `swarm --ensemble`       | Ensemble voting mode                     |
| `jobs`                   | List all jobs                            |
| `jobs --stats`           | Job statistics                           |
| `daemon --start`         | Start background daemon                  |
| `daemon --stop`          | Stop background daemon                   |
| `help`                   | Show help                                |

## Examples

```bash
# Smart routing (auto-detect)
./ollama-wrapper.sh route "debug why this async fails"
./ollama-wrapper.sh route "refactor to use repository pattern"
./ollama-wrapper.sh route "extract text from this PDF"
./ollama-wrapper.sh route "convert this UI to React"

# Direct model shortcuts
./ollama-wrapper.sh ask glm "Write a Python LRU cache"
./ollama-wrapper.sh ask kimi "Design distributed system"
./ollama-wrapper.sh ask gemma "Summarize this document"

# Panel consensus
./ollama-wrapper.sh panel "Should we use CQRS for this service?"
./ollama-wrapper.sh panel --tier deep "Database sharding strategy"

# Swarm parallel execution
./ollama-wrapper.sh swarm 3:kimi "analyze src/utils-{i}.ts"
./ollama-wrapper.sh swarm 5:gemma "refactor module" --ensemble

# Code review
./ollama-wrapper.sh route "review src/auth.ts" security
./ollama-wrapper.sh route "review src/db.ts" performance
```

## Model Specifications

See [references/models.md](references/models.md) for detailed specs and pricing.

| Model                | Context  | Best For                                     | Ollama Cloud |
| -------------------- | -------- | -------------------------------------------- | ------------ |
| `kimi-k2.6:cloud`    | **256K** | Multimodal, UI→code, agentic workflows       | Included     |
| `glm-5.1:cloud`      | ~200K    | Coding, agentic engineering, SWE-Bench Pro   | Included     |
| `gemma4:31b-cloud`   | **256K** | OCR, document parsing, refactoring           | Included     |
| `qwen3.5:397b-cloud` | **256K** | Reasoning, coding, 201 languages, multimodal | Included     |

**Note:** All models are included with your Ollama Cloud subscription (Free/Pro/Max tiers). Usage is measured by GPU time, not tokens.

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
  "default_model": "kimi-k2.6:cloud",
  "temperature": "0.1",
  "code_model": "glm-5.1:cloud",
  "review_model": "glm-5.1:cloud"
}
```

## Performance Tips

1. **Use `route`**: Auto-routes to best model for the task
2. **Preload models**: `./ollama-wrapper.sh route --model glm-5.1 "preload"`
3. **JSON mode**: Use `--format json` for structured data
4. **Flash Attention**: Set `OLLAMA_FLASH_ATTENTION=1`

## Review Focus Types

| Focus         | Detects                   |
| ------------- | ------------------------- |
| `general`     | Bugs, best practices      |
| `security`    | Injection, XSS, secrets   |
| `performance` | O(n²), N+1 queries, leaks |

## Related Skills

Use these for **direct single-model access** when you already know which model you need:

| Skill         | Model         | Best For                               | Ollama Cloud |
| ------------- | ------------- | -------------------------------------- | ------------ |
| **ask-kimi**  | **Kimi K2.6** | Multimodal, UI→code, agentic workflows | Included     |
| **ask-glm**   | **GLM-5.1**   | Coding, agentic engineering            | Included     |
| **ask-gemma** | **Gemma 4**   | Refactoring, OCR, document parsing     | Included     |
| **ask-qwen**  | **Qwen 3.5**  | Reasoning, coding, 201 languages       | Included     |

**When to use which:**

- Use **omo** (this skill): Auto-routing, multi-model, panel mode, swarm mode
- Use **ask-\*** skills: Direct specific model access with artifact persistence

## Sources

- [Ollama CLI Reference](https://docs.ollama.com/cli)
- [Ollama Cloud Models](https://docs.ollama.com/cloud)
- [Claude Code Integration](https://docs.ollama.com/integrations/claude-code)
- [Kimi K2.6](https://ollama.com/library/kimi-k2.6)
- [GLM-5.1](https://ollama.com/library/glm-5.1)
- [Gemma 4](https://ollama.com/library/gemma4)
- [Qwen 3.5](https://ollama.com/library/qwen3.5)
