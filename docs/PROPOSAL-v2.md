# Ollama Wrapper v2 - OMC-Inspired Design

## Executive Summary

ปรับปรุง Ollama wrapper ให้เป็น **intelligent orchestrator** ที่ delegate งานให้ model ที่เหมาะสมที่สุด รองรับทั้ง direct Ollama และ Claude+Ollama backend modes

---

## Dual-Mode Architecture

```
User Command
      ↓
[Command Parser]
      ↓
├─→ Mode A: Direct Ollama (ollama run <model>)
│       └─→ เร็ว, ถูก, ใช้กับงาน routine
│
└─→ Mode B: Claude + Ollama backend (ollama launch claude --model <model>)
        └─→ ได้ Claude interface, tools, MCP แต่ backend เป็น Ollama models
```

### เมื่อไหร่ใช้ Mode ไหน:

| Scenario | Mode | เหตุผล |
|----------|------|--------|
| Quick code generation | A | Fast, cheap |
| Need Claude artifacts | B | ได้ UI-rich output |
| Complex debugging | B | Claude มี tools ช่วย |
| Bulk processing | A | Parallel ได้เร็วกว่า |

---

## Feature 1: Smart Router (Auto-Detect)

**Concept จาก OMC:** `ask-kimi`, `ask-glm`, `ask-gemma` แยกตาม expertise

**การทำงาน:**
```bash
./ollama-wrapper.sh smart "debug why this async fails"
# → วิเคราะห์คำสั่ง → detect "debug" → route ไป kimi

./ollama-wrapper.sh smart "design microservices architecture"
# → detect "design" + "architecture" → route ไป glm

./ollama-wrapper.sh smart "refactor this to use repository pattern"
# → detect "refactor" → route ไป gemma
```

**Model Specifications:**

| Model | Context | Best For |
|-------|---------|----------|
| **glm-5.1:cloud** | ~200K | Agentic engineering, coding SOTA, tool integration, 8-hour autonomous execution |
| **kimi-k2.5:cloud** | **256K** | Visual reasoning, UI→code, multimodal, thinking modes |
| **gemma4:31b-cloud** | **256K** | OCR, document parsing, reasoning, coding, function calling |

**Keyword Mapping:**

| Keywords | Route To | เหตุผล |
|----------|----------|--------|
| debug, error, fix, why, investigate | **glm-5.1** | Agentic + tool use, SWE-bench Pro SOTA |
| design, architecture, plan, system | **glm-5.1** | 744B MoE, 8-hour agent support |
| OCR, document, parse, extract | **gemma4** | Native OCR + document parsing |
| UI, visual, screenshot, image→code | **kimi** | Cross-modal reasoning (UI→React) |
| refactor, transform, rename | **gemma4** | Fast + native function calling |

**Implementation:**
```bash
smart_detect() {
    local prompt="$1"
    
    if [[ "$prompt" =~ (debug|error|fix|why|investigate) ]]; then
        echo "kimi"
    elif [[ "$prompt" =~ (design|architecture|plan|system) ]]; then
        echo "glm"
    elif [[ "$prompt" =~ (refactor|transform|rename|migrate) ]]; then
        echo "gemma"
    else
        echo "kimi"  # default
    fi
}
```

---

## Feature 2: Debate Mode (Multi-Model Consensus)

**Concept จาก OMC:** `ai-delegate`, `ccg-full` — debate แล้ว adjudicator ตัดสิน

**การทำงาน:**
```bash
./ollama-wrapper.sh debate "Should we use event sourcing or audit log?"
```

**Flow:**
```
1. Run 3 models กับ prompt เดียวกัน (parallel)
   ├─→ kimi: "From debugging perspective..."
   ├─→ glm: "From systems architecture..."
   └─→ gemma: "From implementation/refactor..."

2. เปรียบเทียบ outputs
   ├─→ หา agreement points (ทุกคนตรงกัน = high confidence)
   ├─→ หา disagreements (บอกว่าใครเห็นอย่างไร)
   └─→ สรุป trade-offs

3. Synthesize verdict
   ├─→ Final recommendation
   ├─→ Risk assessment
   └─→ Action checklist
```

**Output Format:**
```markdown
## Multi-Model Analysis

### Kimi (Reasoning Expert)
- Concerns about debugging complexity with event sourcing
- Points to distributed tracing needs

### GLM (Architecture Expert)
- Event sourcing fits audit requirements naturally
- Warns about event schema versioning

### Gemma (Implementation Expert)
- Audit log simpler to implement
- Less operational overhead

## Agreements (High Confidence)
✓ Both approaches satisfy audit requirements
✓ Need idempotent event handlers

## Disagreements
• Kimi vs GLM: Operational complexity (event sourcing harder to debug)
• GLM vs Gemma: Long-term scalability (event sourcing wins at scale)

## Final Verdict
**Start with audit log** (MVP), **migrate to event sourcing** when scale demands

### Action Checklist
- [ ] Implement audit log table
- [ ] Design event schema (future-proof)
- [ ] Add migration path documentation
```

**Quality Tiers (จาก ai-delegate):**

| Consensus | Tier | Output |
|-----------|------|--------|
| ≥90% | FAST | สรุป agreement อย่างเดียว |
| 70-90% | STANDARD | แสดง disagreements |
| <70% | DEEP | Deep analysis + judge evaluation |

---

## Feature 3: Team Mode (Parallel Workers)

**Concept จาก OMC:** `omc-teams-ollama` — N workers parallel

**การทำงาน:**
```bash
# รัน 3 workers กับ subtask ต่างกัน
./ollama-wrapper.sh team 3:kimi "Analyze file-{1..3}.ts"

# รัน 5 workers กับ task เดียวกัน (ensemble voting)
./ollama-wrapper.sh team 5:gemma "Refactor this function" --same-task
```

**Use Cases:**

1. **Distribute Work:** 3 ไฟล์ → 3 workers → 3x faster
2. **Ensemble:** 5 workers ตอบคำถามเดียวกัน → เอา majority vote
3. **Multi-Perspective:** kimi + glm + gemma พร้อมกัน → รวมผล

**Implementation:**
```bash
team_mode() {
    local count="$1"    # e.g., "3"
    local model="$2"    # e.g., "kimi"
    local task="$3"
    
    # Spawn parallel processes
    for i in $(seq 1 "$count"); do
        local subtask=$(echo "$task" | sed "s/{i}/$i/g")
        ollama run "${model}:cloud" "$subtask" > ".omc/artifacts/teams/${model}-${i}.md" &
    done
    wait
    
    # Synthesize results
    echo "=== Team Results ===" | tee .omc/artifacts/teams/summary.md
    for f in .omc/artifacts/teams/${model}-*.md; do
        echo "--- Worker: $f ---" | tee -a .omc/artifacts/teams/summary.md
        cat "$f" | tee -a .omc/artifacts/teams/summary.md
    done
}
```

---

## Feature 4: Artifact Persistence

**Concept จาก OMC:** ทุก skill บันทึก output → `.omc/artifacts/`

**Structure:**
```
.omc/artifacts/ollama/
├── 20260418-103000-kimi-debug-async.md
├── 20260418-103500-debate-architecture.md
└── teams/
    ├── 20260418-104000-glm-design/
    │   ├── glm-1.md
    │   ├── glm-2.md
    │   └── summary.md
    └── 20260418-105000-kimi-refactor/
        ├── kimi-1.md
        └── summary.md
```

**Benefits:**
- Audit trail: "เมื่อวาน Claude แนะนำอะไรไว้?"
- Resume: หยุดตรงไหน กลับมาทำต่อได้
- Compare: ผลลัพธ์จาก model ไหนดีกว่า

**Auto-save:**
```bash
./ollama-wrapper.sh --artifact run "prompt"
# Output → stdout + file
```

---

## Command Reference (Proposed)

```bash
# Mode A: Direct Ollama
./ollama-wrapper.sh run "prompt"                    # Default model
./ollama-wrapper.sh kimi "prompt"                   # Direct to kimi
./ollama-wrapper.sh glm "prompt"                    # Direct to glm
./ollama-wrapper.sh gemma "prompt"                  # Direct to gemma

# Mode B: Claude + Ollama backend
./ollama-wrapper.sh claude --model kimi-k2.5:cloud "prompt"
./ollama-wrapper.sh claude --model glm-5.1:cloud "prompt"

# Smart Router (Auto-detect)
./ollama-wrapper.sh smart "prompt"                  # Auto-route based on keywords
./ollama-wrapper.sh smart --explain "prompt"        # บอกว่า why route ไป model นี้

# Debate Mode
./ollama-wrapper.sh debate "prompt"                 # Run ทั้ง 3 models
./ollama-wrapper.sh debate --tier fast "prompt"     # Consensus ≥90% only
./ollama-wrapper.sh debate --tier deep "prompt"     # Full analysis + judge

# Team Mode
./ollama-wrapper.sh team N:kimi "task-{i}"          # N parallel workers
./ollama-wrapper.sh team 5:gemma "task" --ensemble  # Ensemble voting

# With Artifacts
./ollama-wrapper.sh --artifact run "prompt"         # Save to file
./ollama-wrapper.sh --artifact debate "prompt"      # Save all 3 outputs

# Utility
./ollama-wrapper.sh artifacts                       # List recent artifacts
./ollama-wrapper.sh replay <artifact-id>            # Re-run saved prompt
```

---

## Implementation Phases

### Phase 1: Smart Router (Week 1)
- [ ] Keyword detection logic
- [ ] Route mapping table
- [ ] `--explain` flag

### Phase 2: Debate Mode (Week 2)
- [ ] Parallel execution (3 models)
- [ ] Agreement/disagreement detection
- [ ] Quality tier logic (FAST/STANDARD/DEEP)
- [ ] Synthesis output

### Phase 3: Team Mode (Week 3)
- [ ] Parallel worker spawning
- [ ] Subtask templating ({1}, {2}, ...)
- [ ] Ensemble voting
- [ ] Summary generation

### Phase 4: Artifacts (Week 4)
- [ ] Auto-save to `.omc/artifacts/ollama/`
- [ ] Timestamp + task hash naming
- [ ] `artifacts` and `replay` commands

---

## Migration Path

**Current → New (Backward Compatible):**
```bash
# Current (ยังใช้ได้)
./ollama-wrapper.sh kimi "prompt"
./ollama-wrapper.sh run "prompt"

# New (เพิ่มเข้ามา)
./ollama-wrapper.sh smart "prompt"       # Auto-route
./ollama-wrapper.sh debate "prompt"      # Multi-model
./ollama-wrapper.sh team 3:kimi "task"   # Parallel
```

---

## Comparison: Before vs After

| Task | Before | After |
|------|--------|-------|
| Debug error | `./ollama-wrapper.sh kimi "debug..."` | `./ollama-wrapper.sh smart "debug..."` (auto) |
| Architecture decision | รัน model เดียว, ได้ perspective เดียว | `./ollama-wrapper.sh debate "..."` (3 perspectives) |
| Refactor 10 files | รัน 10 ครั้ง serial | `./ollama-wrapper.sh team 5:gemma "file-{i}"` (parallel) |
| Review PR | ลืมไปแล้วว่า model ไหนแนะนำอะไร | `./ollama-wrapper.sh --artifact debate "..."` (saved) |

---

## Questions for Review

1. **Priority:** เอา Phase ไหนก่อน? (แนะนำ Phase 1 → 2 → 3 → 4)
2. **Mode B:** ต้องการ `claude` mode ด้วยหรือ focus ที่ direct Ollama?
3. **Quality Tiers:** ต้องการ auto-detect consensus หรือ user เลือก tier เอง?
4. **Artifacts:** เก็บทุก command หรือเฉพาะ `--artifact` flag?

---

*Draft v2 - 2026-04-18*
