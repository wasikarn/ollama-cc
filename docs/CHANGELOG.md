# Changelog

## v0.2.7 — Wiki-Central Patterns (Retry, Circuit Breaker, Consensus)

### Added

- **Circuit Breaker** (`scripts/lib/circuit-breaker.mjs`) — state-machine proxy (CLOSED → OPEN → HALF_OPEN)
  - Prevents cascading failures when Ollama is down/overloaded
  - Global breaker registry (`getBreaker()`, `getAllBreakerStatuses()`)
  - 8 tests covering trip, timeout, half-open, manual override
- **Retry Pattern v2** — `withRetry()` in `utils.mjs` upgraded per wiki-central
  - Error classification: quota → 4x delay, connection → 2x, timeout → 1.5x
  - Exponential backoff with jitter (up to 30%)
  - Proper logging: WARN for retries, ERROR for final failure
  - Avoids "DDoS yourself" from aggressive retry on capacity

### Changed

- **Panel consensus scoring** (`calculateAgreement`) — replaced naive word overlap with weighted composite:
  - 40% word Jaccard overlap (length > 3)
  - 30% technical keyword overlap (80+ weighted terms: microservices, kubernetes, async, etc.)
  - 20% sentence-level overlap (first 3 sentences, 3+ common words)
  - 10% structure similarity (bullets, numbered lists, code blocks, headers)

## v0.2.6 — Health Check Command

### Added

- **`/ollama:health` / `omo health`** — System health check command
  - Verifies Ollama installation and version
  - Lists available models via `ollama list`
  - Checks which configured models are ready to use
  - Shows `ollama pull <model>` command for missing models
  - JSON output mode (`--format json`)
- Updated `omo.mjs` CLI dispatcher with `health` case
- Added `omo-health` binary to package.json

## v0.2.5 — Response Caching

### Added

- **File-based response cache** (`scripts/lib/cache.mjs`) with SHA-256 key hashing
  - Cache stored in `~/.ollama-cc/cache/` with 1-hour default TTL
  - Cache key = `sha256(model + ":" + prompt).slice(0,16)`
  - `getCachedResponse()`, `setCachedResponse()`, `clearCache()`, `getCacheStats()`
- **`--no-cache` flag** on `route`, `panel`, and `swarm` commands
  - Disables reading from and writing to cache
  - Default: caching enabled
- **Cache hit indicators** in terminal output
  - Panel: `✓ CACHED (30s ago)`
  - Swarm: `✓ CACHED (30s ago)`
  - Route: streams cached output directly
- **8 cache tests** covering store/retrieve, TTL expiry, model isolation, empty output, stats

## v0.2.4 — Graceful Model Failures + Cost Visibility

### Added

- **Graceful model failure handling** in panel — `Promise.allSettled` pattern
  - If 1 model fails, remaining models still produce results
  - Failures reported in output, JSON (`failures` array), and artifacts
  - Only exits if ALL models fail
- **Token estimates in panel** — shows `~N per model × M = ~total` before execution
- **`estimatedTokens` field** in JSON output

### Fixed

- **Panel crash on single model failure** — previously `Promise.all` rejected on first failure, losing all results
- Removed unused `getPromptTemplate` import from route.mjs
- Removed unused `createJob` import from panel.mjs

## v0.2.3 — LLM Synthesis

### Added

- **LLM-based synthesis** (`--synthesize`) for panel command
  - After parallel model execution, runs qwen3.5 as synthesizer
  - Produces unified response capturing consensus, disagreements, and recommendation
  - Output included in artifacts and JSON (`synthesis` field)
  - Graceful fallback if synthesizer fails

## v0.2.2 — Vertical Routing

### Added

- **Vertical routing** (`--vertical`) — complexity-aware model selection
  - `detectComplexity()` scores prompts on length, code presence, technical density, reasoning depth
  - Simple tasks downgraded to faster models (e.g., glm-5.1 → kimi)
  - Complex tasks upgraded to most capable models (e.g., kimi → qwen)
  - Works alongside intent classification; displayed in `--explain`, `--dry-run`, `--budget`

## v0.2.1 — Ephemeral Background Execution

### Changed

- **Removed persistent daemon** — replaced with ephemeral one-shot processes
  - Old: `omo daemon --start` → daemon runs forever → `omo daemon --stop`
  - New: `--detach` spawns process → runs job → exits automatically
  - Zero idle resource usage, simpler architecture
- `daemon` command now shows background job status only (no start/stop)
- `panel --detach` and `swarm --detach` use `spawnBackground()` instead of `submitToDaemon()`

### Removed

- `scripts/daemon-worker.mjs` — persistent daemon worker
- `scripts/lib/daemon.mjs` — daemon lifecycle management
- `omo daemon --start` and `omo daemon --stop` flags

## v0.2.0 — Refactor Release

### Breaking Changes

- **Renamed commands** for clarity:
  - `smart` → `route` (auto-route to best model)
  - `debate` → `panel` (panel of experts consensus)
  - `team` → `swarm` (parallel worker swarm)
  - `status` → `jobs` + `daemon` (separated concerns)
- **Renamed skill**: `ollama-cc` → `omo`
- **Renamed CLI**: `ollama-cc` → `omo`, `ollama-smart` → `omo-route`, etc.

### Added

- `/ollama:ask` command for unified direct model access
- `/ollama:daemon` command for daemon control
- `omo-daemon` CLI binary
- Backward compatibility aliases in CLI (`smart`, `debate`, `team`, `status`)
- `docs/ARCHITECTURE.md`
- `docs/MIGRATION.md`

### Changed

- `status` command split into `jobs` (job lifecycle) and `daemon` (daemon control)
- Script names now match command names: `route.mjs`, `panel.mjs`, `swarm.mjs`, `jobs.mjs`, `daemon.mjs`
- Main entry point renamed from `index.mjs` to `omo.mjs`
- Wrapper script updated with new commands and backward-compatible aliases

### Removed

- Empty `agents/` directory
- Old command files: `commands/smart.md`, `commands/debate.md`, `commands/team.md`, `commands/status.md`
- Old skill directory: `skills/ollama-cc/`

## v0.1.0 — Initial Release

- Intent-based routing with role classification
- Job lifecycle management with JSON persistence
- Structured JSON output (`--format json`)
- Background execution with daemon (`--detach`)
- Status command for job monitoring
- Retry logic with exponential backoff
- XML prompt block system
- Multi-model debate mode with consensus scoring
- Team mode with parallel workers and ensemble voting
