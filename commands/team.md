---
name: team
description: Run parallel team execution with N workers. Supports distributed tasks or ensemble voting mode.
argument-hint: <N:model> "<task>" [--ensemble]
---

# /ollama:team

Execute tasks in parallel with multiple Ollama model workers.

## Usage

```
/ollama:team 3:kimi "analyze file-{i}.ts"
/ollama:team 5:gemma "refactor module" --ensemble
```

## Specifications

- **Distribute Mode**: Each worker gets different subtask (file-1.ts, file-2.ts, etc.)
- **Ensemble Mode**: All workers process same task, results aggregated

## Worker Specification

Format: `N:model` where N = worker count, model = kimi|glm|gemma

| Model Short | Full Name | Strengths |
|-------------|-----------|-----------|
| kimi | kimi-k2.5:cloud | Reasoning, multimodal |
| glm | glm-5.1:cloud | Coding, architecture |
| gemma | gemma4:31b-cloud | Refactoring, OCR |

## Task Templates

Use placeholders for distribute mode:
- `{i}` - 1-indexed (1, 2, 3...)
- `{0}` - 0-indexed (0, 1, 2...)
- `{n}` - Total count

## Examples

```bash
# Distribute: Analyze 3 different files
/ollama:team 3:kimi "analyze src/utils-{i}.ts"

# Distribute: Refactor 5 modules
/ollama:team 5:gemma "refactor src/module-{i}"

# Ensemble: 4 workers vote on same task
/ollama:team 4:glm "Review this PR for security issues" --ensemble

# Distribute: Process files 0-9
/ollama:team 10:kimi "extract data from log-{0}.txt"
```

## Execution

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/team.mjs "{{spec}}" "{{task}}" {{#if ensemble}}--ensemble{{/if}}
```
