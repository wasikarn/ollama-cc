#!/usr/bin/env node
/**
 * OMO - Main Entry Point
 * Provides unified CLI for all commands
 */

import { smartRouter } from './route.mjs';
import { debateMode } from './panel.mjs';
import { teamMode } from './swarm.mjs';
import { healthCheck } from './health.mjs';
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
OMO v${VERSION} — Ollama Model Orchestrator

Commands:
  route [--explain] "<prompt>"     Auto-route to best model
  panel [--tier] "<prompt>"       Multi-model consensus
  swarm N:model "<task>"         Parallel workers
  jobs [job-id] [--stats]          Job lifecycle management
  daemon [--status]              Background job status
  health [--format json]         Check Ollama + model availability
  help                             Show this help

Examples:
  omo route "debug this error"
  omo route --explain "refactor this code"
  omo panel "Should we use microservices?"
  omo panel --tier fast "Quick check"
  omo swarm 3:kimi "analyze file-{i}.ts"
`;

async function main() {
  const { flags, positionals } = parseArgs(process.argv);
  const command = positionals[0];

  switch (command) {
    case 'route':
    case 'smart': {
      const explainFlag = flags.explain === true;
      const prompt = positionals.slice(1).join(' ');
      await smartRouter(prompt, { explain: explainFlag });
      break;
    }

    case 'panel':
    case 'debate': {
      const tier = flags.tier || 'standard';
      const prompt = positionals.slice(1).join(' ');
      await debateMode(prompt, { tier });
      break;
    }

    case 'swarm':
    case 'team': {
      const ensembleFlag = flags.ensemble === true;
      const teamSpec = positionals[1];
      const task = positionals.slice(2).join(' ');
      await teamMode(teamSpec, null, task, { ensemble: ensembleFlag });
      break;
    }

    case 'jobs':
    case 'status': {
      const { default: jobsMain } = await import('./jobs.mjs');
      process.argv = ['node', 'jobs.mjs', ...positionals.slice(1)];
      jobsMain();
      break;
    }

    case 'daemon': {
      const { default: daemonMain } = await import('./daemon.mjs');
      process.argv = ['node', 'daemon.mjs', ...positionals.slice(1)];
      daemonMain();
      break;
    }

    case 'health': {
      const format = flags.format || 'text';
      await healthCheck({ format });
      break;
    }

    case 'help':
    default:
      console.log(USAGE);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
