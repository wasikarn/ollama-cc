#!/bin/bash
# OMO - Ollama Model Orchestrator Wrapper
# Routes commands to the appropriate .mjs files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

show_help() {
    cat << 'EOF'
Usage: ./ollama-wrapper.sh <command> [args...]

Commands:
  route <prompt>            Auto-route to best model based on prompt
  panel <prompt>           Multi-model panel consensus
  swarm <prompt>          Parallel swarm execution
  ask <model> <prompt>    Direct model access (kimi|glm|gemma|qwen)
  jobs [options]           Job lifecycle management
  daemon [options]         Daemon control
  help                     Show this help message

Route Options:
  --model <name>          Override model (kimi, glm-5.1, gemma4, qwen)
  --explain               Show routing decision
  --show-intent           Show intent classification
  --verbose               Detailed output

Panel Options:
  --tier <fast|standard|deep>   Quality tier (default: standard)
  --format json             JSON output
  --detach                  Run in background

Swarm Options:
  --ensemble                Ensemble voting mode
  --format json             JSON output
  --detach                  Run in background

Jobs Options:
  --stats                   Show job statistics
  --running                 List running jobs
  --completed               List completed jobs
  --failed                  List failed jobs
  --pending                 List pending jobs
  --cleanup                 Clean up old jobs (7 days)

Daemon Options:
  --start                   Start the daemon
  --stop                    Stop the daemon
  --status                  Show daemon status

Examples:
  ./ollama-wrapper.sh route "debug this error"
  ./ollama-wrapper.sh route --model glm-5.1 "fix this bug"
  ./ollama-wrapper.sh panel "review this architecture"
  ./ollama-wrapper.sh panel --tier deep --detach "complex decision"
  ./ollama-wrapper.sh swarm 3:kimi "analyze file-{i}.ts"
  ./ollama-wrapper.sh ask kimi "generate React from screenshot"
  ./ollama-wrapper.sh jobs --running
  ./ollama-wrapper.sh daemon --start
EOF
}

check_status() {
    echo "=== OMO Status ==="
    echo ""
    echo "Config file: ~/.ollama-cli/config.json"
    if [ -f "$HOME/.ollama-cli/config.json" ]; then
        echo "✓ Config exists"
        cat "$HOME/.ollama-cli/config.json"
    else
        echo "✗ Config not found (will use defaults)"
    fi
    echo ""
    echo "Job Store: ~/.ollama-cc/jobs/"
    if [ -d "$HOME/.ollama-cc/jobs" ]; then
        local job_count=$(ls "$HOME/.ollama-cc/jobs"/*.json 2>/dev/null | wc -l)
        echo "✓ Jobs stored: $job_count"
    else
        echo "✗ No jobs yet"
    fi
    echo ""
    echo "Commands available:"
    ls -la "$SCRIPT_DIR/scripts/"*.mjs 2>/dev/null | grep -v daemon-worker || echo "  (none found)"
}

# Main command routing
case "${1:-}" in
    route|smart)
        shift
        node "$SCRIPT_DIR/scripts/route.mjs" "$@"
        ;;
    panel|debate)
        shift
        node "$SCRIPT_DIR/scripts/panel.mjs" "$@"
        ;;
    swarm|team)
        shift
        node "$SCRIPT_DIR/scripts/swarm.mjs" "$@"
        ;;
    ask)
        shift
        model="$1"
        shift
        node "$SCRIPT_DIR/scripts/route.mjs" --model "$model" "$@"
        ;;
    jobs|status)
        shift
        node "$SCRIPT_DIR/scripts/jobs.mjs" "$@"
        ;;
    daemon)
        shift
        node "$SCRIPT_DIR/scripts/daemon.mjs" "$@"
        ;;
    help|--help|-h)
        show_help
        ;;
    status-check)
        check_status
        ;;
    '')
        echo "Error: No command specified"
        show_help
        exit 1
        ;;
    *)
        echo "Error: Unknown command: $1"
        show_help
        exit 1
        ;;
esac
