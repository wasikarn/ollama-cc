---
name: panel
version: "1.1.0"
description: Run multi-model panel discussion. Executes prompt on all 4 models (kimi, glm, gemma, qwen) in parallel and synthesizes consensus. Use --models to select a subset.
argument-hint: <prompt> [--tier fast|standard|deep] [--format json] [--detach] [--models <model1,model2>]
---

# /ollama:panel

Run multi-model consensus with 4 Ollama models executing in parallel.

## Usage

```
/ollama:panel "Should we use event sourcing or audit log?"
/ollama:panel --tier fast "Is this code secure?"
/ollama:panel --tier deep "Architecture trade-offs for scale"
/ollama:panel --format json "Review this code"
/ollama:panel --detach "Long running analysis"
/ollama:panel --models glm,qwen "Math problem analysis"
```

## Flags

| Flag              | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `--tier <tier>`   | Quality tier: fast, standard, deep (default: standard) |
| `--format json`   | JSON output for machine parsing                        |
| `--detach`        | Run in background (ephemeral one-shot process)         |
| `--models <list>` | Comma-separated subset of models to run                |

## Quality Tiers

| Tier     | Consensus Threshold | Output                  |
| -------- | ------------------- | ----------------------- |
| fast     | ≥90%                | Agreement summary only  |
| standard | 70-90%              | Shows disagreements     |
| deep     | <70%                | Full analysis + verdict |

## Model Selection

Run all 4 models by default, or select a subset with `--models`:

```bash
# Run all 4 models (default)
/ollama:panel "Should we use microservices?"

# Run only 2 models
/ollama:panel --models glm,gemma "Quick code review"

# Run only reasoning models
/ollama:panel --models glm,qwen "Complex algorithm design"
```

**Available models:** `kimi`, `glm`, `gemma`, `qwen`

## Output Formats

| Format | Description                                 |
| ------ | ------------------------------------------- |
| text   | Human-readable output with colors (default) |
| json   | Machine-readable JSON                       |

### JSON Output Schema

```json
{
  "verdict": "high|medium|low",
  "confidence": 0.85,
  "models": [...],
  "agreements": {...},
  "consensusLevel": "high",
  "timestamp": "2026-01-15T10:30:00Z"
}
```

## Background Execution

Use `--detach` to run the panel in the background:

```bash
/ollama:panel --detach "Long running analysis"
# Check status later
/ollama:jobs <job-id>
```

## Flow

1. Run prompt on selected models simultaneously:
   - **kimi-k2.6:cloud** - Reasoning, debugging perspective
   - **glm-5.1:cloud** - Architecture, systems perspective
   - **gemma4:31b-cloud** - Implementation, refactoring perspective
   - **qwen3.5:397b-cloud** - Long-context, document analysis perspective

2. Calculate agreement scores between all pairs

3. Synthesize consensus analysis

## Examples

```bash
# Standard panel (default — all 4 models)
/ollama:panel "Should we use microservices or monolith?"

# Quick consensus check
/ollama:panel --tier fast "Is this function pure?"

# Deep analysis with trade-offs
/ollama:panel --tier deep "Database sharding strategy"

# JSON output for integration
/ollama:panel --format json "Review this API design"

# Background execution
/ollama:panel --detach "Analyze codebase architecture"

# Subset of models
/ollama:panel --models glm,qwen "Solve this math problem"
```

## Execution

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/panel.mjs "{{prompt}}" {{#if tier}}--tier {{tier}}{{/if}} {{#if format}}--format {{format}}{{/if}} {{#if models}}--models {{models}}{{/if}} {{#if detach}}--detach{{/if}}
```
