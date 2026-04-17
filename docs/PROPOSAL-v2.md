# Ollama Wrapper v2 - OMC-Inspired Design

## Executive Summary

Evolve the Ollama wrapper into an **intelligent orchestrator** that delegates tasks to the most appropriate model. Supports both direct Ollama and Claude+Ollama backend modes.

---

## Dual-Mode Architecture

```
User Command
      ↓
[Command Parser]
      ↓
├─→ Mode A: Direct Ollama (ollama run <model>)
│       └─→ Fast, cheap, for routine tasks
│
└─→ Mode B: Claude + Ollama backend (ollama launch claude --model <model>)
        └─→ Get Claude interface, tools, MCP with Ollama models as backend
```

### When to use each Mode:

| Scenario | Mode | Reason |
|----------|------|--------|
| Quick code generation | A | Fast, cheap |
| Need Claude artifacts | B | Get UI-rich output |
| Complex debugging | B | Claude has tools to help |
| Bulk processing | A | Parallel execution is faster |

---

## Feature 1: Smart Router (Auto-Detect)

**Concept from OMC:** `ask-kimi`, `ask-glm`, `ask-gemma` separated by expertise

**How it works:**
```bash
./ollama-wrapper.sh smart "debug why this async fails"
# → Analyze command → detect "debug" → route to kimi

./ollama-wrapper.sh smart "design microservices architecture"
# → detect "design" + "architecture" → route to glm

./ollama-wrapper.sh smart "refactor this to use repository pattern"
# → detect "refactor" → route to gemma
```

**Model Specifications:**

| Model | Context | Best For |
|-------|---------|----------|
| **glm-5.1:cloud** | ~200K | Agentic engineering, coding SOTA, tool integration, 8-hour autonomous execution |
| **kimi-k2.5:cloud** | **256K** | Visual reasoning, UI→code, multimodal, thinking modes |
| **gemma4:31b-cloud** | **256K** | OCR, document parsing, reasoning, coding, function calling |

**Keyword Mapping:**

| Keywords | Route To | Reason |
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

**Concept from OMC:** `ai-delegate`, `ccg-full` — debate then adjudicator decides

**How it works:**
```bash
./ollama-wrapper.sh debate "Should we use event sourcing or audit log?"
```

**Flow:**
```
1. Run 3 models with same prompt (parallel)
   ├─→ kimi: "From debugging perspective..."
   ├─→ glm: "From systems architecture..."
   └─→ gemma: "From implementation/refactor..."

2. Compare outputs
   ├─→ Find agreement points (all agree = high confidence)
   ├─→ Find disagreements (show who thinks what)
   └─→ Summarize trade-offs

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

**Quality Tiers (from ai-delegate):**

| Consensus | Tier | Output |
|-----------|------|--------|
| ≥90% | FAST | Summary of agreements only |
| 70-90% | STANDARD | Show disagreements |
| <70% | DEEP | Deep analysis + judge evaluation |

---

## Feature 3: Team Mode (Parallel Workers)

**Concept from OMC:** `omc-teams-ollama` — N workers parallel

**How it works:**
```bash
# Run 3 workers with different subtasks
./ollama-wrapper.sh team 3:kimi "Analyze file-{1..3}.ts"

# Run 5 workers with same task (ensemble voting)
./ollama-wrapper.sh team 5:gemma "Refactor this function" --same-task
```

**Use Cases:**

1. **Distribute Work:** 3 files → 3 workers → 3x faster
2. **Ensemble:** 5 workers answer same question → take majority vote
3. **Multi-Perspective:** kimi + glm + gemma together → combine results

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

**Concept from OMC:** Every skill saves output → `.omc/artifacts/`

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
- Audit trail: "What did Claude recommend yesterday?"
- Resume: Stop anywhere, continue later
- Compare: Which model gave better results?

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
./ollama-wrapper.sh smart --explain "prompt"        # Show why routed to this model

# Debate Mode
./ollama-wrapper.sh debate "prompt"                 # Run all 3 models
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
# Current (still works)
./ollama-wrapper.sh kimi "prompt"
./ollama-wrapper.sh run "prompt"

# New (added)
./ollama-wrapper.sh smart "prompt"       # Auto-route
./ollama-wrapper.sh debate "prompt"      # Multi-model
./ollama-wrapper.sh team 3:kimi "task"   # Parallel
```

---

## Comparison: Before vs After

| Task | Before | After |
|------|--------|-------|
| Debug error | `./ollama-wrapper.sh kimi "debug..."` | `./ollama-wrapper.sh smart "debug..."` (auto) |
| Architecture decision | Run single model, get single perspective | `./ollama-wrapper.sh debate "..."` (3 perspectives) |
| Refactor 10 files | Run 10 times serially | `./ollama-wrapper.sh team 5:gemma "file-{i}"` (parallel) |
| Review PR | Forgot which model recommended what | `./ollama-wrapper.sh --artifact debate "..."` (saved) |

---

## Questions for Review

1. **Priority:** Which Phase first? (Recommended: Phase 1 → 2 → 3 → 4)
2. **Mode B:** Need `claude` mode or focus on direct Ollama?
3. **Quality Tiers:** Auto-detect consensus or user selects tier?
4. **Artifacts:** Store every command or only `--artifact` flag?

---

*Draft v2 - 2026-04-18*
