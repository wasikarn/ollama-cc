# Ollama CC

## Purpose

Plugin นี้จัดการ Ollama cloud models ด้วย intelligent routing

## Commands

- `/ollama:smart` — Auto-route ตาม task type
- `/ollama:debate` — Multi-model consensus  
- `/ollama:team` — Parallel execution

## Smart Router

| Keywords | Route To |
|----------|----------|
| debug, error, fix | glm-5.1 |
| design, architecture | glm-5.1 |
| OCR, document | gemma4 |
| UI, visual | kimi |
| refactor | gemma4 |

## Setup

```bash
ollama signin
```

## Models

- **kimi-k2.5:cloud** — 256K, multimodal, FREE
- **glm-5.1:cloud** — 200K, coding SOTA
- **gemma4:31b-cloud** — 256K, OCR, Apache 2.0