---
name: ask-gemma
type: prompt
description: DIRECT access to the Gemma 4 model for specific single-model tasks. Use when you KNOW you need Gemma specifically (fast refactoring, OCR, cost-efficient, native function calling). For automatic model selection or multi-model orchestration, use the ollama-cc skill instead.
triggers:
  - use gemma model
  - run with gemma
  - gemma refactor
  - gemma ocr
  - ollama gemma
  - gemma for documents
---

# Ask Gemma

**Single-model direct access**: Invoke Gemma 4 specifically when you already know this is the right model for the task.

**When to use ask-gemma vs ollama-cc:**

- Use **ask-gemma**: You specifically need Gemma (fast refactoring, OCR, cost-efficient, native function calling)
- Use **ollama-cc**: You want automatic routing, multiple models, or team/debate modes

## Model Strengths

- **Refactoring**: Fast, consistent structural changes
- **OCR**: Native document parsing and text extraction
- **Function Calling**: Native support for tool use
- **Context**: 256K tokens
- **Included**: Yes (with Ollama Cloud subscription)

## Execution

```bash
mkdir -p .claude/artifacts/ask
ollama run gemma4:31b-cloud -- "<PROMPT>" \
  | tee .claude/artifacts/ask/gemma-$(date +%s).md
```

Read the artifact and synthesize Gemma's response with Claude's analysis.

## Usage

```
Use ask-gemma: <prompt>
```

**Examples:**

```
Use ask-gemma: refactor to use repository pattern
Use ask-gemma: extract text from PDF document
Use ask-gemma: rename userId to accountId across codebase
```

## See Also

- **ask-kimi** - For Kimi K2.6 (multimodal, UI→code, free)
- **ask-glm** - For GLM-5.1 (coding, architecture, SWE-Bench)
- **ollama-cc** - For smart routing, multi-model, team mode
