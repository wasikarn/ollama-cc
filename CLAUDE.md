# Ollama CC

## Purpose

Plugin for managing Ollama cloud models with intelligent routing and job lifecycle management

## Commands

- `/ollama:smart` — Auto-route based on intent classification
- `/ollama:debate` — Multi-model consensus with JSON output
- `/ollama:team` — Parallel execution with distribute or ensemble modes
- `/ollama:status` — Job management and daemon control

## Smart Router (Intent-Based)

| Intent    | Patterns                        | Routes To | Role         |
| --------- | ------------------------------- | --------- | ------------ |
| DEBUG     | debug, error, fix, crash        | glm-5.1   | investigator |
| IMPLEMENT | code, implement, write function | glm-5.1   | executor     |
| DESIGN    | design, architecture, pattern   | glm-5.1   | architect    |
| REVIEW    | review, analyze, check          | glm-5.1   | reviewer     |
| REFACTOR  | refactor, transform, migrate    | gemma4    | refactorer   |
| DOCUMENT  | ocr, document, extract          | gemma4    | documenter   |
| VISUAL    | ui, screenshot, mockup          | kimi      | designer     |
| EXPLAIN   | explain, how does, what is      | kimi      | educator     |
| TEST      | test, unit test, coverage       | glm-5.1   | tester       |

### Flags

- `--show-intent` — Display intent classification
- `--explain` — Show model selection reasoning
- `--model <name>` — Override model (kimi, glm-5.1, gemma4)
- `--no-structured` — Disable XML prompt blocks

## Debate Mode

```bash
/ollama:debate "Should we use event sourcing?"
/ollama:debate --tier fast "Quick check"
/ollama:debate --tier deep "Complex analysis"
/ollama:debate --format json "For automation"
/ollama:debate --detach "Background execution"
```

## Team Mode

```bash
/ollama:team 3:kimi "analyze file-{i}.ts"           # Distribute
/ollama:team 5:gemma "Review PR" --ensemble         # Ensemble voting
/ollama:team 10:glm "refactor" --detach            # Background
/ollama:team 3:kimi "task" --format json           # JSON output
```

## Job Management

```bash
/ollama:status                              # View all jobs
/ollama:status --running                    # Running jobs
/ollama:status --completed                  # Completed jobs
/ollama:status --failed                     # Failed jobs
/ollama:status <job-id>                     # View details
/ollama:status --stats                      # Summary statistics
/ollama:status --cleanup                    # Remove old jobs
```

## Daemon Control

```bash
/ollama:status --start                      # Start daemon
/ollama:status --stop                       # Stop daemon
/ollama:status --daemon                     # Check status
```

## Setup

```bash
ollama signin
```

Optional config: `~/.ollama-cli/config.json`

```json
{
  "default_model": "kimi-k2.6:cloud",
  "code_model": "glm-5.1:cloud",
  "review_model": "gemma4:31b-cloud"
}
```

## Models

- **kimi-k2.6:cloud** — 256K, multimodal, FREE
- **glm-5.1:cloud** — 200K, coding SOTA
- **gemma4:31b-cloud** — 256K, OCR, Apache 2.0
