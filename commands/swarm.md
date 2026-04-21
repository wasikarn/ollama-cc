---
name: swarm
version: "1.0.0"
description: Run parallel swarm execution with N workers. Supports distributed tasks or ensemble voting mode.
argument-hint: <N:model> "<task>" [--ensemble] [--format json] [--detach] [--no-cache]
---

# /ollama:swarm

Execute tasks in parallel with multiple Ollama model workers.

## Usage

```
/ollama:swarm 3:kimi "analyze file-{i}.ts"
/ollama:swarm 5:gemma "refactor module" --ensemble
/ollama:swarm 3:glm "review code" --format json
/ollama:swarm 5:kimi "analyze project" --detach
```

## Specifications

- **Distribute Mode**: Each worker gets different subtask (file-1.ts, file-2.ts, etc.)
- **Ensemble Mode**: All workers process same task, results aggregated

## Worker Specification

Format: `N:model` where N = worker count, model = kimi|glm|gemma|qwen

| Model Short | Full Name          | Strengths               |
| ----------- | ------------------ | ----------------------- |
| kimi        | kimi-k2.6:cloud    | Reasoning, multimodal   |
| glm         | glm-5.1:cloud      | Coding, architecture    |
| gemma       | gemma4:31b-cloud   | Refactoring, OCR        |
| qwen        | qwen3.5:397b-cloud | Long context (1M), docs |

## Task Templates

Use placeholders for distribute mode:

- `{i}` - 1-indexed (1, 2, 3...)
- `{0}` - 0-indexed (0, 1, 2...)
- `{n}` - Total count

## Output Formats

| Format | Description                                                |
| ------ | ---------------------------------------------------------- |
| text   | Human-readable output with colors and formatting (default) |
| json   | Machine-readable JSON with structured results              |

### JSON Output Schema

```json
{
  "spec": { "count": 3, "modelKey": "kimi", "modelName": "kimi-k2.6:cloud" },
  "mode": "ensemble|distribute",
  "summary": { "workers": 3, "totalTime": 45000, "averageTime": 15000 },
  "ensemble": { "agreement": "high", "themes": [...] },
  "results": [...],
  "timestamp": "2026-01-15T10:30:00Z"
}
```

## Background Execution

Use `--detach` to run the swarm in the background via the daemon:

```bash
/ollama:swarm 5:kimi "analyze project" --detach
# Check status later
/ollama:jobs <job-id>
```

## Examples

```bash
# Distribute: Analyze 3 different files
/ollama:swarm 3:kimi "analyze src/utils-{i}.ts"

# Distribute: Refactor 5 modules
/ollama:swarm 5:gemma "refactor src/module-{i}"

# Ensemble: 4 workers vote on same task
/ollama:swarm 4:glm "Review this PR for security issues" --ensemble

# Distribute: Process files 0-9
/ollama:swarm 10:kimi "extract data from log-{0}.txt"

# JSON output for integration
/ollama:swarm 3:glm "review architecture" --format json

# Background execution for long tasks
/ollama:swarm 10:kimi "analyze entire codebase" --detach

# Distribute: Process massive documents with Qwen
/ollama:swarm 3:qwen "summarize document-{i}.pdf" --detach
```

## Execution

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/swarm.mjs "{{spec}}" "{{task}}" {{#if ensemble}}--ensemble{{/if}} {{#if format}}--format {{format}}{{/if}} {{#if detach}}--detach{{/if}} {{#if no-cache}}--no-cache{{/if}}
```
