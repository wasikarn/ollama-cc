---
name: health
version: "1.0.0"
description: Check Ollama installation, model availability, and system status. Reports which configured models are ready to use.
argument-hint: [--format json]
---

# /ollama:health

Check Ollama installation status and model availability.

## Usage

```
/ollama:health
/ollama:health --format json
```

## Flags

| Flag            | Description                     |
| --------------- | ------------------------------- |
| `--format json` | JSON output for machine parsing |

## Output

### Text Mode (default)

```
═══════════════════════════════════════════════════
  OMO Health Check
═══════════════════════════════════════════════════

✓ Ollama installed — v0.3.0

Available Models: 4
  • kimi-k2.6:cloud (-)
  • glm-5.1:cloud (-)
  • gemma4:31b-cloud (-)
  • qwen3.5:397b-cloud (-)

Configured Models:
  ✓ kimi-k2.6:cloud — Multimodal agentic workflows, UI-to-code generation
  ✓ glm-5.1:cloud — Systems architecture, agentic debugging
  ✓ gemma4:31b-cloud — Document OCR, code refactoring
  ✓ qwen3.5:397b-cloud — Complex reasoning, coding, multilingual tasks

═══════════════════════════════════════════════════
  All systems ready ✓
═══════════════════════════════════════════════════
```

### JSON Mode

```json
{
  "ollama": {
    "installed": true,
    "version": "0.3.0"
  },
  "models": [
    { "key": "kimi", "name": "kimi-k2.6:cloud", "available": true, ... }
  ],
  "summary": {
    "total": 4,
    "available": 4,
    "ready": true
  },
  "timestamp": "2026-04-22T10:30:00Z"
}
```

## Execution

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/health.mjs {{#if format}}--format {{format}}{{/if}}
```
