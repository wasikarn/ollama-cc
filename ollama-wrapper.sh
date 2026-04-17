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
  status               Check configuration and model availability
  help                 Show this help message

Examples:
  ./ollama-wrapper.sh smart "debug this error"
  ./ollama-wrapper.sh debate "review this architecture"
  ./ollama-wrapper.sh team "generate test cases"
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
    echo "Commands available:"
    ls -la "$SCRIPT_DIR/commands/"*.mjs 2>/dev/null || echo "  (none found)"
}

# Main command routing
case "${1:-}" in
    smart)
        shift
        node "$SCRIPT_DIR/commands/smart.mjs" "$@"
        ;;
    debate)
        shift
        node "$SCRIPT_DIR/commands/debate.mjs" "$@"
        ;;
    team)
        shift
        node "$SCRIPT_DIR/commands/team.mjs" "$@"
        ;;
    kimi)
        shift
        node "$SCRIPT_DIR/commands/smart.mjs" --model kimi "$@"
        ;;
    glm)
        shift
        node "$SCRIPT_DIR/commands/smart.mjs" --model glm "$@"
        ;;
    gemma)
        shift
        node "$SCRIPT_DIR/commands/smart.mjs" --model gemma "$@"
        ;;
    status)
        check_status
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
