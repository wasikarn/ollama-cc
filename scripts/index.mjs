#!/usr/bin/env node
/**
 * Ollama CC - Main Entry Point
 * Provides unified CLI for all commands
 */

import { smartRouter } from './smart.mjs';
import { debateMode } from './debate.mjs';
import { teamMode } from './team.mjs';
import { parseArgs } from './lib/utils.mjs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Get version from package.json
function getVersion() {
  try {
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg.version || '0.0.1';
  } catch {
    return '0.0.1';
  }
}

const VERSION = getVersion();

const USAGE = `
Ollama CC v${VERSION}

Commands:
  smart [--explain] "<prompt>"     Auto-route to best model (Phase 1)
  debate [--tier] "<prompt>"      Multi-model consensus (Phase 2)
  team N:model "<task>"           Parallel workers (Phase 3)
  status                          Check plugin status
  help                            Show this help

Examples:
  ollama-cc smart "debug this error"
  ollama-cc smart --explain "refactor this code"
  ollama-cc debate "Should we use microservices?"
  ollama-cc debate --tier fast "Quick check"
  ollama-cc team 3:kimi "analyze file-{i}.ts"
`;

async function main() {
  const { flags, positionals } = parseArgs(process.argv);
  const command = positionals[0];

  switch (command) {
    case 'smart': {
      const explainFlag = flags.explain === true;
      const prompt = positionals.slice(1).join(' ');
      await smartRouter(prompt, { explain: explainFlag });
      break;
    }

    case 'debate': {
      const tier = flags.tier || 'standard';
      const prompt = positionals.slice(1).join(' ');
      await debateMode(prompt, { tier });
      break;
    }

    case 'team': {
      const ensembleFlag = flags.ensemble === true;
      const teamSpec = positionals[1];
      const task = positionals.slice(2).join(' ');
      await teamMode(teamSpec, null, task, { ensemble: ensembleFlag });
      break;
    }

    case 'status':
      console.log(`Ollama CC v${VERSION}`);
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
