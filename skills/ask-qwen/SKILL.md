---
name: ask-qwen
type: prompt
description: DIRECT access to the Qwen 3.5 397B model for specific single-model tasks. Use when you KNOW you need Qwen specifically (coding, reasoning, multimodal, 201 languages). For automatic model selection or multi-model orchestration, use the ollama-cc skill instead.
triggers:
  - use qwen model
  - run with qwen
  - qwen coding
  - qwen reasoning
  - qwen multimodal
  - ollama qwen
  - qwen 397b
---

# Ask Qwen

**Single-model direct access**: Invoke Qwen 3.5 397B specifically when you already know this is the right model for the task.

**When to use ask-qwen vs ollama-cc:**

- Use **ask-qwen**: You specifically need Qwen (coding, reasoning, multimodal, 201 languages)
- Use **ollama-cc**: You want automatic routing, multiple models, or team/debate modes

## Model Strengths

- **Parameters**: 397B total / 17B active (MoE)
- **Context**: 256K tokens
- **Architecture**: Gated Delta Networks + Sparse MoE
- **Multilingual**: 201 languages and dialects
- **Multimodal**: Vision-language capabilities
- **Benchmarks**: MMMU 85.0%, MathVision 88.6%, SWE-bench Verified 76.2%, AIME26 91.3%
- **Included**: Yes (with Ollama Cloud subscription)

## Best Use Cases

- **Complex Reasoning**: AIME26 91.3% performance
- **Coding Tasks**: SWE-bench Verified 76.2%
- **Multimodal Understanding**: MMMU 85.0%, MathVision 88.6%
- **Multi-language Tasks**: 201 languages supported
- **Agentic Workflows**: OSWorld and AndroidWorld benchmarks

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
Use ask-qwen: solve this complex math problem step by step
Use ask-qwen: analyze this image and describe the UI components
Use ask-qwen: write a Python function with reasoning
Use ask-qwen: translate this technical document to Japanese
```

## See Also

- **ask-kimi** - For Kimi K2.6 (multimodal, UI→code, 256K context)
- **ask-glm** - For GLM-5.1 (coding, architecture, SWE-Bench, ~200K context)
- **ask-gemma** - For Gemma 4 (refactoring, OCR, 256K context)
- **ollama-cc** - For smart routing, multi-model, team mode
