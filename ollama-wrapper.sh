#!/bin/bash
# Ollama CC Wrapper Script
# Routes commands to the appropriate .mjs files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

show_help() {
    cat << 'EOF'
Usage: ./ollama-wrapper.sh <command> [args...]

Commands:
  smart <prompt>       Auto-route to best model based on prompt
  debate <prompt>      Run multi-model debate mode
  team <prompt>        Run parallel team execution
  kimi <prompt>        Direct access to Kimi K2.5
  glm <prompt>         Direct access to GLM-5.1
  gemma <prompt>       Direct access to Gemma 4
  status [options]     Check jobs and daemon status
  help                 Show this help message

Smart Options:
  --model <name>       Override model (kimi, glm-5.1, gemma4)
  --explain            Show routing decision
  --show-intent        Show intent classification
  --verbose            Detailed output

Debate Options:
  --tier <fast|standard|deep>   Quality tier (default: standard)
  --format json        JSON output
  --detach             Run in background

Team Options:
  --ensemble           Ensemble voting mode
  --format json        JSON output
  --detach             Run in background

Status Options:
  --daemon             Show daemon status
  --stats              Show job statistics
  --running            List running jobs
  --completed          List completed jobs
  --failed             List failed jobs
  --pending            List pending jobs
  --start              Start daemon
  --stop               Stop daemon
  --cleanup            Clean up old jobs (7 days)

Examples:
  ./ollama-wrapper.sh smart "debug this error"
  ./ollama-wrapper.sh smart --model glm-5.1 "fix this bug"
  ./ollama-wrapper.sh debate "review this architecture"
  ./ollama-wrapper.sh debate --tier deep --detach "complex decision"
  ./ollama-wrapper.sh team 3:kimi "analyze file-{i}.ts"
  ./ollama-wrapper.sh status                    # Show all jobs
  ./ollama-wrapper.sh status --running          # Show running jobs
EOF
}

check_status() {
    echo "=== Ollama CC Status ==="
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
    smart)
        shift
        node "$SCRIPT_DIR/scripts/smart.mjs" "$@"
        ;;
    debate)
        shift
        node "$SCRIPT_DIR/scripts/debate.mjs" "$@"
        ;;
    team)
        shift
        node "$SCRIPT_DIR/scripts/team.mjs" "$@"
        ;;
    kimi)
        shift
        node "$SCRIPT_DIR/scripts/smart.mjs" --model kimi "$@"
        ;;
    glm)
        shift
        node "$SCRIPT_DIR/scripts/smart.mjs" --model glm "$@"
        ;;
    gemma)
        shift
        node "$SCRIPT_DIR/scripts/smart.mjs" --model gemma "$@"
        ;;
    status)
        shift
        node "$SCRIPT_DIR/scripts/status.mjs" "$@"
        ;;
    help|--help|-h)
        show_help
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
