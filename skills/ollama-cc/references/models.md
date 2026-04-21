# Model Specifications (Cloud Only)

All models require `ollama signin` (cloud-hosted, no local download).

## Available Models

| Model              | Context  | Best For                                      | Cost     |
| ------------------ | -------- | --------------------------------------------- | -------- |
| `kimi-k2.6:cloud`  | **256K** | Multimodal, UI→code, reasoning                | **FREE** |
| `glm-5.1:cloud`    | ~200K    | Coding SOTA, agentic debugging, 8-hour tasks  | $1/M     |
| `gemma4:31b-cloud` | **256K** | OCR/document parsing, refactoring, Apache 2.0 | $0.14/M  |

## Kimi K2.6

**Context:** 256K tokens
**Cost:** FREE

**Strengths:**

- Cross-modal understanding (text + images)
- UI/screenshot to code conversion
- Long-context reasoning
- General-purpose balanced performance

**Use for:**

- Visual tasks, UI generation
- Multimodal prompts
- Default/fallback model

## GLM-5.1

**Context:** ~200K tokens
**Cost:** $1 per million tokens

**Strengths:**

- SWE-Bench Pro SOTA
- Agentic coding capabilities
- Extended task support (8-hour sessions)
- 744B parameter MoE architecture

**Use for:**

- Code generation and debugging
- Architecture design
- Long-running agent tasks
- Code review

## Gemma 4 (31B)

**Context:** 256K tokens
**Cost:** $0.14 per million tokens

**Strengths:**

- Native OCR capabilities
- Apache 2.0 license (open)
- Fast inference
- Native function calling

**Use for:**

- Document text extraction
- PDF parsing
- Code refactoring
- Cost-sensitive workloads
