# Ollama CC

## Purpose

Plugin นี้จัดการ Ollama cloud models ด้วย intelligent routing และ job lifecycle management

## Commands

- `/ollama:smart` — Auto-route ตาม intent classification
- `/ollama:debate` — Multi-model consensus  พร้อม JSON output
- `/ollama:team` — Parallel execution แบบ distribute หรือ ensemble
- `/ollama:status` — Job management และ daemon control

## Smart Router (Intent-Based)

| Intent | Patterns | Routes To | Role |
|--------|----------|-----------|------|
| DEBUG | debug, error, fix, crash | glm-5.1 | investigator |
| IMPLEMENT | code, implement, write function | glm-5.1 | executor |
| DESIGN | design, architecture, pattern | glm-5.1 | architect |
| REVIEW | review, analyze, check | glm-5.1 | reviewer |
| REFACTOR | refactor, transform, migrate | gemma4 | refactorer |
| DOCUMENT | ocr, document, extract | gemma4 | documenter |
| VISUAL | ui, screenshot, mockup | kimi | designer |
| EXPLAIN | explain, how does, what is | kimi | educator |
| TEST | test, unit test, coverage | glm-5.1 | tester |

### Flags
- `--show-intent` — แสดง intent classification
- `--explain` — แสดงเหตุผลการเลือก model
- `--model <name>` — Override model (kimi, glm-5.1, gemma4)
- `--no-structured` — ปิด XML prompt blocks

## Debate Mode

```bash
/ollama:debate "Should we use event sourcing?"
/ollama:debate --tier fast "Quick check"
/ollama:debate --tier deep "Complex analysis"
/ollama:debate --format json "For automation"
/ollama:debate --detach "Background execution"
```

## Team Mode

```bash
/ollama:team 3:kimi "analyze file-{i}.ts"           # Distribute
/ollama:team 5:gemma "Review PR" --ensemble         # Ensemble voting
/ollama:team 10:glm "refactor" --detach           # Background
/ollama:team 3:kimi "task" --format json           # JSON output
```

## Job Management

```bash
/ollama:status                              # ดูทุก job
/ollama:status --running                    # กำลังทำงาน
/ollama:status --completed                  # เสร็จแล้ว
/ollama:status --failed                     # ล้มเหลว
/ollama:status <job-id>                     # ดูรายละเอียด
/ollama:status --stats                      # สถิติรวม
/ollama:status --cleanup                    # ลบงานเก่า
```

## Daemon Control

```bash
/ollama:status --start                      # เปิด daemon
/ollama:status --stop                       # ปิด daemon
/ollama:status --daemon                     # เช็คสถานะ
```

## Setup

```bash
ollama signin
```

Optional config: `~/.ollama-cli/config.json`
```json
{
  "default_model": "kimi-k2.5:cloud",
  "code_model": "glm-5.1:cloud",
  "review_model": "gemma4:31b-cloud"
}
```

## Models

- **kimi-k2.5:cloud** — 256K, multimodal, FREE
- **glm-5.1:cloud** — 200K, coding SOTA
- **gemma4:31b-cloud** — 256K, OCR, Apache 2.0
