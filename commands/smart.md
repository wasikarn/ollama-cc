---
name: smart
description: Auto-route prompts to the best Ollama model using intent-based classification. Detects task type (debug, design, refactor, etc.) and routes to kimik2.5, glm-5.1, or gemma4 with structured XML prompts.
argument-hint: <prompt> [--explain] [--show-intent] [--verbose] [--no-structured]
---

# /ollama:smart

Auto-route prompts to the best Ollama model using intelligent intent classification.

## Usage

```
/ollama:smart "debug this async function"
/ollama:smart --explain "design a microservices architecture"
/ollama:smart --show-intent "refactor this to use repository pattern"
```

## Flags

| Flag | Description |
|------|-------------|
| `--explain` | Show routing analysis with confidence scores |
| `--show-intent` | Display intent classification details |
| `--verbose` | Include full classification data |
| `--no-structured` | Disable XML structured prompts |
| `--model <name>` | Override model selection |

## Intent-Based Model Routing

The smart router uses an intent classification system to determine the best model:

| Intent | Role | Routes To | Best For |
|--------|------|-----------|----------|
| DEBUG | investigator | glm-5.1:cloud | Debugging, root cause analysis |
| IMPLEMENT | executor | glm-5.1:cloud | Code implementation |
| DESIGN | architect | glm-5.1:cloud | System architecture |
| REVIEW | reviewer | glm-5.1:cloud | Code review |
| REFACTOR | refactorer | gemma4:31b-cloud | Code transformation |
| DOCUMENT | documenter | gemma4:31b-cloud | OCR, text extraction |
| VISUAL | designer | kimi-k2.5:cloud | UI generation, multimodal |
| EXPLAIN | educator | kimi-k2.5:cloud | Teaching, clarification |
| TEST | tester | glm-5.1:cloud | Test generation |

## Examples

```bash
# Debug - routes to glm-5.1 with investigator role
/ollama:smart "debug why this async function fails"

# Show intent classification
/ollama:smart --show-intent "fix the memory leak in this service"

# Design - routes to glm-5.1 with architect role
/ollama:smart "design a payment gateway architecture"

# With full explanation
/ollama:smart --explain "refactor this to use repository pattern"

# Visual - routes to kimi with designer role
/ollama:smart "convert this screenshot to React code"

# OCR - routes to gemma4 with documenter role
/ollama:smart "extract text from this PDF"

# Model override
/ollama:smart --model kimi "implement a quick sort"
```

## Intent Classification Output

With `--show-intent`, the router displays:

```
Intent Classification:
  Intent: DEBUG
  Confidence: 92.5%
  Role: investigator
  Description: Debugging and error investigation
  Recommended Model: glm-5.1
  Alternatives:
    - IMPLEMENT (45.2%)
```

## Structured Prompts

When enabled (default), the router wraps prompts in XML blocks:

```xml
<system role="investigator" confidence="0.92">
  Investigator mode activated. Focus on root cause analysis.
</system>

<intent type="debug">
  Focus on root cause analysis. Provide step-by-step debugging approach.
</intent>

<task priority="normal">
  debug why this async function fails
</task>
```

## Execution

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/smart.mjs "{{prompt}}" \
  {{#if explain}}--explain{{/if}} \
  {{#if show-intent}}--show-intent{{/if}} \
  {{#if verbose}}--verbose{{/if}}
```
