---
name: ask-qwen
type: prompt
description: DIRECT access to the Qwen 3.5 397B model for specific single-model tasks. Use when you KNOW you need Qwen specifically (ultra-long context up to 1M tokens, massive document analysis, full codebase reading, multi-document comparison). For automatic model selection or multi-model orchestration, use the ollama-cc skill instead.
triggers:
  - use qwen model
  - run with qwen
  - qwen long context
  - qwen massive document
  - qwen 1m context
  - ollama qwen
  - qwen for codebase
  - qwen analyze logs
---

# Ask Qwen

**Single-model direct access**: Invoke Qwen 3.5 397B specifically when you already know this is the right model for the task.

**When to use ask-qwen vs ollama-cc:**

- Use **ask-qwen**: You specifically need Qwen (ultra-long context up to 1M tokens, massive document analysis, full codebase reading)
- Use **ollama-cc**: You want automatic routing, multiple models, or team/debate modes

## Model Strengths

- **Ultra-Long Context**: Up to 1,000,000 tokens (1M) with YaRN extension
- **Native Context**: 262,144 tokens (262K)
- **Architecture**: 397B total parameters / 17B active (MoE with 512 experts)
- **Multilingual**: 201 languages supported
- **Multimodal**: Vision-language capabilities (text, images, video)
- **Thinking Mode**: Generates reasoning before final response
- **Context**: 1M tokens (extended), 262K native
- **Included**: Yes (with Ollama Cloud subscription)

## Best Use Cases

- **Full Codebase Analysis**: Read entire repositories in one pass
- **Massive Document Summarization**: Books, reports, legal documents
- **Long Log Analysis**: Months of logs without chunking
- **Multi-Document Comparison**: Compare hundreds of documents simultaneously
- **Translation of Long Texts**: Novels, technical manuals

## Execution

```bash
mkdir -p .claude/artifacts/ask
ollama run qwen3.5:397b-cloud -- "<PROMPT>" \
  | tee .claude/artifacts/ask/qwen-$(date +%s).md
```

Read the artifact and synthesize Qwen's response with Claude's analysis.

## Usage

```
Use ask-qwen: <prompt>
```

**Examples:**

```
Use ask-qwen: summarize this 500-page technical manual
Use ask-qwen: analyze the entire codebase for security issues
Use ask-qwen: compare these 100 customer feedback documents
Use ask-qwen: translate this novel from English to Thai
```

## See Also

- **ask-kimi** - For Kimi K2.6 (multimodal, UI→code, 256K context)
- **ask-glm** - For GLM-5.1 (coding, architecture, SWE-Bench, ~200K context)
- **ask-gemma** - For Gemma 4 (refactoring, OCR, cost-efficient, 256K context)
- **ollama-cc** - For smart routing, multi-model, team mode
