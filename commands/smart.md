---
name: smart
description: Auto-route prompts to the best Ollama model based on keywords. Detects task type (debug, design, refactor, etc.) and routes to kimik2.5, glm-5.1, or gemma4.
argument-hint: <prompt> [--explain]
---

# /ollama:smart

Auto-route prompts to the best Ollama model using intelligent keyword detection.

## Usage

```
/ollama:smart "debug this async function"
/ollama:smart --explain "design a microservices architecture"
```

## Model Routing

| Keywords | Routes To | Best For |
|----------|-----------|----------|
| debug, error, fix, why | glm-5.1:cloud | Debugging, investigation |
| design, architecture, plan | glm-5.1:cloud | System design |
| refactor, transform, migrate | gemma4:31b-cloud | Code refactoring |
| ui, visual, screenshot | kimi-k2.5:cloud | UI generation |
| ocr, document, extract | gemma4:31b-cloud | Document parsing |

## Examples

```bash
# Debug - routes to glm-5.1
/ollama:smart "debug why this async function fails"

# Design - routes to glm-5.1
/ollama:smart "design a payment gateway architecture"

# Refactor - routes to gemma4
/ollama:smart "refactor this to use repository pattern"

# Visual - routes to kimi
/ollama:smart "convert this screenshot to React code"

# With explanation
/ollama:smart --explain "extract text from this PDF"
```

## Execution

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/smart.mjs "{{prompt}}" {{#if explain}}--explain{{/if}}
```
