---
name: ask
version: "1.0.0"
description: Direct single-model access. Run a prompt on a specific Ollama model without routing logic.
argument-hint: <model> <prompt> [--no-structured]
---

# /ollama:ask

Direct access to a specific Ollama model. Use when you already know which model you need.

## Usage

```
/ollama:ask kimi "generate React from this screenshot"
/ollama:ask glm "debug this race condition"
/ollama:ask gemma "extract text from this PDF"
/ollama:ask qwen "solve this math problem step by step"
```

## Models

| Short | Full Name          | Best For                                   |
| ----- | ------------------ | ------------------------------------------ |
| kimi  | kimi-k2.6:cloud    | Multimodal, UI→code, agentic workflows     |
| glm   | glm-5.1:cloud      | Coding, architecture, agentic debugging    |
| gemma | gemma4:31b-cloud   | Refactoring, OCR, document parsing         |
| qwen  | qwen3.5:397b-cloud | Reasoning, math, 201 languages, multimodal |

## Flags

| Flag              | Description                    |
| ----------------- | ------------------------------ |
| `--no-structured` | Disable XML structured prompts |

## Examples

```bash
# Direct Kimi access for visual tasks
/ollama:ask kimi "convert this Figma design to React components"

# Direct GLM access for debugging
/ollama:ask glm "debug why this async function deadlocks"

# Direct Gemma for OCR
/ollama:ask gemma "extract tables from this scanned document"

# Direct Qwen for reasoning
/ollama:ask qwen "prove that P ≠ NP... just kidding, explain Big O notation"
```

## Execution

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/route.mjs --model {{model}} "{{prompt}}"
```
