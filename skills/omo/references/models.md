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

| Model                | Context | Best For                                      | Included |
| -------------------- | ------- | --------------------------------------------- | -------- |
| `kimi-k2.6:cloud`    | 256K    | Multimodal, UI→code, agentic workflows        | Yes      |
| `glm-5.1:cloud`      | ~200K   | Coding SOTA, agentic debugging, 8-hour tasks  | Yes      |
| `gemma4:31b-cloud`   | 256K    | OCR/document parsing, refactoring, Apache 2.0 | Yes      |
| `qwen3.5:397b-cloud` | 256K    | Coding, reasoning, multimodal, 201 languages  | Yes      |

## Kimi K2.6

**Context:** 256K tokens  
**Architecture:** Native multimodal agentic model  
**Included:** Yes (with Ollama Cloud subscription)

**Strengths:**

- Native multimodal (vision, text, tools)
- Complex end-to-end coding (Rust, Go, Python)
- Agent swarm: 300 sub-agents, 4,000 coordinated steps
- Production-ready UI generation from visual inputs
- 24/7 background agents for proactive execution

**Use for:**

- Visual tasks, UI generation
- Multimodal prompts
- Agentic workflows
- Complex coding tasks

## GLM-5.1

**Context:** ~200K tokens  
**Architecture:** Agentic engineering model  
**Included:** Yes (with Ollama Cloud subscription)

**Strengths:**

- SWE-Bench Pro: 58.4%
- NL2Repo and Terminal-Bench 2.0 tasks
- Long-horizon agentic tasks (hundreds of rounds, thousands of tool calls)
- Iterative reasoning and strategy revision
- Ambiguous problem solving

**Use for:**

- Code generation and debugging
- Architecture design
- Long-running agent tasks
- Code review

## Gemma 4 (31B)

**Context:** 256K tokens  
**Parameters:** 30.7B (dense), 60 layers  
**Included:** Yes (with Ollama Cloud subscription)

**Strengths:**

- Native OCR capabilities
- Apache 2.0 license (open)
- Fast inference
- Native function calling
- Configurable thinking mode via `<|think|>` token

**Use for:**

- Document text extraction
- PDF parsing
- Code refactoring
- Cost-sensitive workloads

## Qwen 3.5 397B

**Context:** 256K tokens  
**Parameters:** 397B total / 17B active (MoE)  
**Included:** Yes (with Ollama Cloud subscription)

**Strengths:**

- MMMU: 85.0%
- MathVision: 88.6%
- SWE-bench Verified: 76.2%
- AIME26: 91.3%
- 201 languages and dialects
- Gated Delta Networks + Sparse MoE architecture
- Near-100% multimodal training efficiency
- Agentic workflows (OSWorld, AndroidWorld)

**Use for:**

- Complex reasoning tasks
- Multimodal understanding
- Coding and software engineering
- Massive document analysis
- Multi-language tasks

---

**Note:** Parameter and context specifications for Kimi and GLM are not publicly disclosed by their providers. The values shown are estimates based on available documentation.

**Alternative:** These models can also be accessed directly via their providers' APIs, but Ollama Cloud provides a unified interface with subscription billing.
