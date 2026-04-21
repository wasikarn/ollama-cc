---
name: debate
version: "1.0.0"
description: Run multi-model debate mode. Executes prompt on all 3 models (kimi, glm, gemma) in parallel and synthesizes consensus.
argument-hint: <prompt> [--tier fast|standard|deep] [--format json] [--detach]
---

# /ollama:debate

Run multi-model consensus with 3 Ollama models executing in parallel.

## Usage

```
/ollama:debate "Should we use event sourcing or audit log?"
/ollama:debate --tier fast "Is this code secure?"
/ollama:debate --tier deep "Architecture trade-offs for scale"
/ollama:debate --format json "Review this code"
/ollama:debate --detach "Long running analysis"
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

Use `--detach` to run the debate in the background via the daemon:

```bash
/ollama:debate --detach "Long running analysis"
# Check status later
/ollama:status <job-id>
```

## Flow

1. Run prompt on all 3 models simultaneously:
   - **kimi-k2.6:cloud** - Reasoning, debugging perspective
   - **glm-5.1:cloud** - Architecture, systems perspective
   - **gemma4:31b-cloud** - Implementation, refactoring perspective

2. Calculate agreement scores between all pairs

3. Synthesize consensus analysis

## Examples

```bash
# Standard debate (default)
/ollama:debate "Should we use microservices or monolith?"

# Quick consensus check
/ollama:debate --tier fast "Is this function pure?"

# Deep analysis with trade-offs
/ollama:debate --tier deep "Database sharding strategy"

# JSON output for integration
/ollama:debate --format json "Review this API design"

# Background execution
/ollama:debate --detach "Analyze codebase architecture"
```

## Execution

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/debate.mjs "{{prompt}}" {{#if tier}}--tier {{tier}}{{/if}} {{#if format}}--format {{format}}{{/if}} {{#if detach}}--detach{{/if}}
```
