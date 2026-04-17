#!/usr/bin/env node
/**
 * Ollama CC - Main Entry Point
 * Provides unified CLI for all commands
 */

import { smartRouter } from './smart.mjs';
import { debateMode } from './debate.mjs';
import { teamMode } from './team.mjs';

const USAGE = `
Ollama CC v2.0.0

Commands:
  smart [--explain] "<prompt>"     Auto-route to best model (Phase 1)
  debate [--tier] "<prompt>"      Multi-model consensus (Phase 2)
  team N:model "<task>"           Parallel workers (Phase 3)
  status                          Check plugin status
  help                            Show this help

Examples:
  ./commands/index.mjs smart "debug this error"
  ./commands/index.mjs smart --explain "refactor this code"
  ./commands/index.mjs debate "Should we use microservices?"
  ./commands/index.mjs debate --tier fast "Quick check"
  ./commands/index.mjs team 3:kimi "analyze file-{i}.ts"
`;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'smart': {
      const explainFlag = args.includes('--explain');
      const promptIndex = args.findIndex((a, i) => i > 0 && !a.startsWith('--'));
      const prompt = promptIndex >= 0 ? args[promptIndex] : null;
      await smartRouter(prompt, { explain: explainFlag });
      break;
    }

    case 'debate': {
      const tierIndex = args.indexOf('--tier');
      const tier = tierIndex >= 0 ? args[tierIndex + 1] : 'standard';
      const filteredArgs = args.filter((_, i) => i !== 0 && i !== tierIndex && i !== tierIndex + 1);
      const prompt = filteredArgs.join(' ');
      await debateMode(prompt, { tier });
      break;
    }

    case 'team': {
      const ensembleFlag = args.includes('--ensemble');
      const filteredArgs = args.filter(a => a !== '--ensemble');
      const teamSpec = filteredArgs[1];
      const task = filteredArgs.slice(2).join(' ');
      await teamMode(teamSpec, null, task, { ensemble: ensembleFlag });
      break;
    }

    case 'status':
      console.log('Ollama CC v2.0.0');
      console.log('Phase 1 (Smart Router): ✓ Active');
      console.log('Phase 2 (Debate Mode): ✓ Active');
      console.log('Phase 3 (Team Mode): ✓ Active');
      break;

    case 'help':
    default:
      console.log(USAGE);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
