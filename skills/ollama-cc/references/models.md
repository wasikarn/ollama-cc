# Model Specifications (Cloud Only)

All models require `ollama signin` (cloud-hosted, no local download).

## Ollama Cloud Pricing

Ollama Cloud uses **subscription-based pricing** (not per-token):

| Plan | Monthly Cost | Usage Level        | Concurrent Models |
| ---- | ------------ | ------------------ | ----------------- |
| Free | $0           | Light usage        | 1                 |
| Pro  | $20          | 50x more than Free | 3                 |
| Max  | $100         | 5x more than Pro   | 10                |

**Note:** All models below are included in your Ollama Cloud subscription. Usage is measured by GPU time, not tokens.

## Available Models

| Model              | Context  | Best For                                      | Included |
| ------------------ | -------- | --------------------------------------------- | -------- |
| `kimi-k2.6:cloud`  | **256K** | Multimodal, UI→code, reasoning                | Yes      |
| `glm-5.1:cloud`    | ~200K    | Coding SOTA, agentic debugging, 8-hour tasks  | Yes      |
| `gemma4:31b-cloud` | **256K** | OCR/document parsing, refactoring, Apache 2.0 | Yes      |

## Kimi K2.6

**Context:** 256K tokens  
**Included:** Yes (with Ollama Cloud subscription)

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
**Included:** Yes (with Ollama Cloud subscription)

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
**Included:** Yes (with Ollama Cloud subscription)

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

---

**Alternative:** These models can also be accessed directly via their providers' APIs (Zhipu AI for GLM, Moonshot AI for Kimi, Google for Gemma) with pay-per-token pricing, but Ollama Cloud provides a unified interface with subscription billing.
