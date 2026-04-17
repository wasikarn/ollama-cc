---
name: debate
description: Run multi-model debate mode. Executes prompt on all 3 models (kimi, glm, gemma) in parallel and synthesizes consensus.
argument-hint: <prompt> [--tier fast|standard|deep]
---

# /ollama:debate

Run multi-model consensus with 3 Ollama models executing in parallel.

## Usage

```
/ollama:debate "Should we use event sourcing or audit log?"
/ollama:debate --tier fast "Is this code secure?"
/ollama:debate --tier deep "Architecture trade-offs for scale"
```

## Quality Tiers

| Tier | Consensus Threshold | Output |
|------|---------------------|--------|
| fast | ≥90% | Agreement summary only |
| standard | 70-90% | Shows disagreements |
| deep | <70% | Full analysis + verdict |

## Flow

1. Run prompt on all 3 models simultaneously:
   - **kimi-k2.5:cloud** - Reasoning, debugging perspective
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
```

## Execution

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/debate.mjs "{{prompt}}" {{#if tier}}--tier {{tier}}{{/if}}
```
