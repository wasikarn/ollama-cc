#!/usr/bin/env node
/**
 * Ollama CLI Plugin - Smart Router (Phase 1)
 * Auto-detect best model based on prompt keywords
 */

import { spawn } from 'child_process';
import { MODELS, KEYWORD_MAP, OLLAMA_ENV } from './lib/config.mjs';
import { log, escapeShellArg } from './lib/utils.mjs';

/**
 * Detect best model from prompt keywords
 */
export function detectModel(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  for (const mapping of KEYWORD_MAP) {
    for (const pattern of mapping.patterns) {
      const regex = new RegExp(pattern.replace(/\./g, '\\.'), 'i');
      if (regex.test(lowerPrompt)) {
        return {
          model: MODELS[mapping.model].name,
          category: mapping.category,
          reason: MODELS[mapping.model].reason
        };
      }
    }
  }

  // Default
  return {
    model: MODELS.kimi.name,
    category: 'General',
    reason: 'Balanced, FREE, 256K context'
  };
}

/**
 * Run ollama with given model and prompt
 */
function runOllama(model, prompt) {
  return new Promise((resolve, reject) => {
    const escapedPrompt = escapeShellArg(prompt);
    const child = spawn('ollama', ['run', model, escapedPrompt, '--nowordwrap'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...OLLAMA_ENV
      }
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data;
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn ollama: ${err.message}`));
    });
  });
}

/**
 * Main smart router function
 */
export async function smartRouter(prompt, options = {}) {
  if (!prompt) {
    log('error', 'No prompt provided. Usage: smart "<prompt>" [--explain]');
    process.exit(1);
  }

  const detection = detectModel(prompt);

  if (options.explain) {
    log('info', 'Smart Router Analysis:');
    console.log(`  Prompt: ${prompt.slice(0, 60)}...`);
    console.log(`  Category: ${detection.category}`);
    console.log(`  Routed to: ${detection.model}`);
    console.log(`  Reason: ${detection.reason}`);
    console.log('');
  }

  log('model', `Smart route → ${detection.model}`);

  try {
    await runOllama(detection.model, prompt);
  } catch (error) {
    log('error', error.message);
    process.exit(1);
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const explainFlag = args.includes('--explain');
  const promptIndex = args.findIndex(a => !a.startsWith('--'));
  const prompt = promptIndex >= 0 ? args[promptIndex] : null;

  smartRouter(prompt, { explain: explainFlag });
}
