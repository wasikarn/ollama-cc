---
name: ask-glm
type: prompt
description: DIRECT access to the GLM-5.1 model for specific single-model tasks. Use when you KNOW you need GLM specifically (coding, architecture, SWE-Bench, agentic tasks). For automatic model selection or multi-model orchestration, use the ollama-cc skill instead.
triggers:
  - use glm model
  - run with glm
  - glm coding
  - glm architecture
  - glm agentic
  - ollama glm
  - glm for debugging
---

# Ask GLM

**Single-model direct access**: Invoke GLM-5.1 specifically when you already know this is the right model for the task.

**When to use ask-glm vs ollama-cc:**

- Use **ask-glm**: You specifically need GLM (coding, architecture, SWE-Bench SOTA, agentic)
- Use **ollama-cc**: You want automatic routing, multiple models, or team/debate modes

## Model Strengths

- **Coding**: SWE-Bench Verified SOTA performance
- **Architecture**: 744B parameter MoE, 8-hour agent support
- **Agentic Tasks**: Long-horizon planning, systematic breakdown
- **Context**: ~200K tokens
- **Included**: Yes (with Ollama Cloud subscription)

## Execution

```bash
mkdir -p .claude/artifacts/ask
ollama run glm-5.1:cloud -- "<PROMPT>" \
  | tee .claude/artifacts/ask/glm-$(date +%s).md
```

Read the artifact and synthesize GLM's response with Claude's analysis.

## Usage

```
Use ask-glm: <prompt>
```

**Examples:**

```
Use ask-glm: design system architecture for microservices
Use ask-glm: debug complex race condition in async code
Use ask-glm: generate implementation plan for epic TP-123
```

## See Also

- **ask-kimi** - For Kimi K2.6 (multimodal, UI→code, free)
- **ask-gemma** - For Gemma 4 (refactoring, OCR, cost-efficient)
- **ollama-cc** - For smart routing, multi-model, team mode
