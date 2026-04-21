# Ollama Model Orchestrator (OMO)

## Purpose

Plugin for orchestrating Ollama cloud models with intelligent routing, multi-model consensus, and parallel worker execution.

## Commands

- `/ollama:route` — Auto-route prompts to the best model via intent classification
- `/ollama:panel` — Multi-model consensus with structured JSON output
- `/ollama:swarm` — Parallel execution with distribute or ensemble modes
- `/ollama:jobs` — Job lifecycle management and history
- `/ollama:daemon` — Background execution daemon control

## Intent-Based Router

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

### Route Flags

- `--show-intent` — Display intent classification
- `--explain` — Show model selection reasoning
- `--model <name>` — Override model (kimi, glm-5.1, gemma4)
- `--no-structured` — Disable XML prompt blocks

## Panel Mode (Multi-Model Consensus)

```bash
/ollama:panel "Should we use event sourcing?"
/ollama:panel --tier fast "Quick check"
/ollama:panel --tier deep "Complex analysis"
/ollama:panel --format json "For automation"
/ollama:panel --detach "Background execution"
```

## Swarm Mode (Parallel Workers)

```bash
/ollama:swarm 3:kimi "analyze file-{i}.ts"           # Distribute
/ollama:swarm 5:gemma "Review PR" --ensemble         # Ensemble voting
/ollama:swarm 10:glm "refactor" --detach            # Background
/ollama:swarm 3:kimi "task" --format json           # JSON output
```

## Job Management

```bash
/ollama:jobs                              # View all jobs
/ollama:jobs --running                    # Running jobs
/ollama:jobs --completed                  # Completed jobs
/ollama:jobs --failed                     # Failed jobs
/ollama:jobs <job-id>                     # View details
/ollama:jobs --stats                      # Summary statistics
/ollama:jobs --cleanup                    # Remove old jobs
```

## Background Execution

```bash
/ollama:panel --detach "Long running task"   # Spawn background job
/ollama:swarm --detach "Parallel task"       # Spawn background job
/ollama:daemon --status                      # Check background status
/ollama:jobs --running                       # List running jobs
```

Background jobs run as **ephemeral one-shot processes**: spawn, execute, then exit. No persistent daemon, no idle resource usage.

## Direct Model Access (Unified)

```bash
/ollama:ask kimi "prompt"       # Kimi K2.6
/ollama:ask glm "prompt"        # GLM-5.1
/ollama:ask gemma "prompt"      # Gemma 4
/ollama:ask qwen "prompt"       # Qwen 3.5
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

- **kimi-k2.6:cloud** — 256K, multimodal, agentic workflows
- **glm-5.1:cloud** — 200K, coding, agentic engineering
- **gemma4:31b-cloud** — 256K, OCR, Apache 2.0
- **qwen3.5:397b-cloud** — 256K, reasoning, 201 languages
