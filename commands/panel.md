---
name: panel
version: "1.0.0"
description: Run multi-model panel discussion. Executes prompt on all 4 models (kimi, glm, gemma, qwen) in parallel and synthesizes consensus.
argument-hint: <prompt> [--tier fast|standard|deep] [--format json] [--detach]
---

# /ollama:panel

Run multi-model consensus with 3 Ollama models executing in parallel.

## Usage

```
/ollama:panel "Should we use event sourcing or audit log?"
/ollama:panel --tier fast "Is this code secure?"
/ollama:panel --tier deep "Architecture trade-offs for scale"
/ollama:panel --format json "Review this code"
/ollama:panel --detach "Long running analysis"
```

## Quality Tiers

| Tier     | Consensus Threshold | Output                  |
| -------- | ------------------- | ----------------------- |
| fast     | ≥90%                | Agreement summary only  |
| standard | 70-90%              | Shows disagreements     |
| deep     | <70%                | Full analysis + verdict |

## Output Formats

| Format | Description                                                |
| ------ | ---------------------------------------------------------- |
| text   | Human-readable output with colors and formatting (default) |
| json   | Machine-readable JSON with structured results              |

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

Use `--detach` to run the panel in the background via the daemon:

```bash
/ollama:panel --detach "Long running analysis"
# Check status later
/ollama:jobs <job-id>
```

## Flow

1. Run prompt on all 4 models simultaneously:
   - **kimi-k2.6:cloud** - Reasoning, debugging perspective
   - **glm-5.1:cloud** - Architecture, systems perspective
   - **gemma4:31b-cloud** - Implementation, refactoring perspective
   - **qwen3.5:397b-cloud** - Long-context, document analysis perspective

2. Calculate agreement scores between all pairs

3. Synthesize consensus analysis

## Examples

```bash
# Standard panel (default)
/ollama:panel "Should we use microservices or monolith?"

# Quick consensus check
/ollama:panel --tier fast "Is this function pure?"

# Deep analysis with trade-offs
/ollama:panel --tier deep "Database sharding strategy"

# JSON output for integration
/ollama:panel --format json "Review this API design"

# Background execution
/ollama:panel --detach "Analyze codebase architecture"
```

## Execution

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/panel.mjs "{{prompt}}" {{#if tier}}--tier {{tier}}{{/if}} {{#if format}}--format {{format}}{{/if}} {{#if detach}}--detach{{/if}}
```
