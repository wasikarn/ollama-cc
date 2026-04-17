#!/usr/bin/env node
/**
 * Ollama CLI Plugin - Smart Router (Phase 1)
 * Auto-detect best model based on prompt keywords
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Model specifications
const MODELS = {
  'glm-5.1': {
    name: 'glm-5.1:cloud',
    context: '200K',
    bestFor: ['debugging', 'coding', 'architecture', 'agentic'],
    reason: 'SWE-Bench Pro SOTA, 8-hour agent support'
  },
  'kimi': {
    name: 'kimi-k2.5:cloud',
    context: '256K',
    bestFor: ['multimodal', 'ui', 'visual', 'reasoning'],
    reason: 'Cross-modal, UI→code, FREE'
  },
  'gemma4': {
    name: 'gemma4:31b-cloud',
    context: '256K',
    bestFor: ['ocr', 'document', 'refactor', 'transform'],
    reason: 'Native OCR, Apache 2.0, function calling'
  }
};

// Keyword mapping for routing
const KEYWORD_MAP = [
  { patterns: ['debug', 'error', 'fix', 'why', 'investigate', 'trace', 'bug'], model: 'glm-5.1', category: 'Debugging' },
  { patterns: ['design', 'architecture', 'plan', 'system', 'structure'], model: 'glm-5.1', category: 'Architecture' },
  { patterns: ['code', 'implement', 'write.*function', 'create.*class', 'programming'], model: 'glm-5.1', category: 'Coding' },
  { patterns: ['ocr', 'document', 'parse', 'extract.*text', 'pdf', 'scan', 'image.*text'], model: 'gemma4', category: 'Document/OCR' },
  { patterns: ['refactor', 'transform', 'rename', 'migrate', 'mechanical'], model: 'gemma4', category: 'Refactoring' },
  { patterns: ['ui', 'visual', 'screenshot', 'image', 'multimodal', 'from.*design'], model: 'kimi', category: 'Visual/Multimodal' },
  { patterns: ['review', 'analyze', 'check', 'audit'], model: 'glm-5.1', category: 'Analysis' }
];

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(type, message) {
  const prefix = {
    info: `${colors.green}[ollama]${colors.reset}`,
    warn: `${colors.yellow}[ollama]${colors.reset}`,
    error: `${colors.red}[ollama]${colors.reset}`,
    model: `${colors.blue}[ollama]${colors.reset}`,
    perf: `${colors.cyan}[ollama]${colors.reset}`
  }[type] || '[ollama]';
  console.log(`${prefix} ${message}`);
}

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
    const child = spawn('ollama', ['run', model, prompt, '--nowordwrap'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        OLLAMA_KEEP_ALIVE: process.env.OLLAMA_KEEP_ALIVE || '1h',
        OLLAMA_NUM_PARALLEL: process.env.OLLAMA_NUM_PARALLEL || '4',
        OLLAMA_FLASH_ATTENTION: process.env.OLLAMA_FLASH_ATTENTION || '1'
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