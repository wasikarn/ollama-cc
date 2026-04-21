# Migration Guide: v0.1.0 → v0.2.0

## Quick Reference

| v0.1.0            | v0.2.0          | Notes                                    |
| ----------------- | --------------- | ---------------------------------------- |
| `/ollama:smart`   | `/ollama:route` | Same functionality, clearer name         |
| `/ollama:debate`  | `/ollama:panel` | Same functionality, clearer name         |
| `/ollama:team`    | `/ollama:swarm` | Same functionality, clearer name         |
| `/ollama:status`  | `/ollama:jobs`  | Daemon control moved to `/ollama:daemon` |
| `ollama-cc` skill | `omo` skill     | New skill name                           |
| `ollama-cc` CLI   | `omo` CLI       | Short prefix                             |

## CLI Migration

### Old (still works)

```bash
ollama-cc smart "debug this"
ollama-cc debate "architecture?"
ollama-cc team 3:kimi "task"
ollama-cc status --running
```

### New (recommended)

```bash
omo route "debug this"
omo panel "architecture?"
omo swarm 3:kimi "task"
omo jobs --running
omo daemon --status
```

## Command Changes

### Smart → Route

```bash
# Old
/ollama:smart "debug this"
/ollama:smart --explain "design this"

# New
/ollama:route "debug this"
/ollama:route --explain "design this"
```

### Debate → Panel

```bash
# Old
/ollama:debate "Should we use microservices?"
/ollama:debate --tier deep "Complex analysis"

# New
/ollama:panel "Should we use microservices?"
/ollama:panel --tier deep "Complex analysis"
```

### Team → Swarm

```bash
# Old
/ollama:team 3:kimi "analyze file-{i}.ts"
/ollama:team 5:gemma "Review PR" --ensemble

# New
/ollama:swarm 3:kimi "analyze file-{i}.ts"
/ollama:swarm 5:gemma "Review PR" --ensemble
```

### Status → Jobs + Daemon

```bash
# Old
/ollama:status              # Show all jobs + daemon
/ollama:status --running    # Filter jobs
/ollama:status --start     # Start daemon
/ollama:status --stop      # Stop daemon

# New
/ollama:jobs               # Show all jobs
/ollama:jobs --running     # Filter jobs
/ollama:daemon --start    # Start daemon
/ollama:daemon --stop     # Stop daemon
```

## Backward Compatibility

The CLI maintains backward compatibility:

- `omo smart` still works (alias for `route`)
- `omo debate` still works (alias for `panel`)
- `omo team` still works (alias for `swarm`)
- `omo status` still works (delegates to `jobs`)

The wrapper script also supports both old and new command names.
