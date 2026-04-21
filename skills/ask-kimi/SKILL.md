---
name: ask-kimi
type: prompt
description: DIRECT access to the Kimi K2.6 model for specific single-model tasks. Use when you KNOW you need Kimi specifically (multimodal, UI-to-code, free tier, 256K context). For automatic model selection or multi-model orchestration, use the ollama-cc skill instead.
triggers:
  - use kimi model
  - run with kimi
  - kimi multimodal
  - kimi vision
  - ollama kimi
  - kimi for ui
  - free model kimi
---

# Ask Kimi

**Single-model direct access**: Invoke Kimi K2.6 specifically when you already know this is the right model for the task.

**When to use ask-kimi vs ollama-cc:**

- Use **ask-kimi**: You specifically need Kimi (multimodal, UI→code, free tier, 256K context)
- Use **ollama-cc**: You want automatic routing, multiple models, or team/debate modes

## Model Strengths

- **Multimodal**: Native vision support for screenshots, diagrams
- **UI-to-Code**: Generate code from visual specifications
- **Agentic Workflows**: Tool orchestration and iterative debugging
- **Context**: 256K tokens
- **Included**: Yes (with Ollama Cloud subscription)

## Execution

```bash
mkdir -p .claude/artifacts/ask
ollama run kimi-k2.6:cloud -- "<PROMPT>" \
  | tee .claude/artifacts/ask/kimi-$(date +%s).md
```

Read the artifact and synthesize Kimi's response with Claude's analysis.

## Usage

```
Use ask-kimi: <prompt>
```

**Examples:**

```
Use ask-kimi: generate React code from this screenshot
Use ask-kimi: debug why this async function hangs
Use ask-kimi: review this PR for UI implementation issues
```

## See Also

- **ask-glm** - For GLM-5.1 (coding, architecture, agentic tasks)
- **ask-gemma** - For Gemma 4 (refactoring, OCR, cost-efficient)
- **ollama-cc** - For smart routing, multi-model, team mode
