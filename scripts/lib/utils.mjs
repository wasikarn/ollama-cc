#!/usr/bin/env node
/**
 * Shared utilities for Ollama CC commands
 */

import { COLORS } from './config.mjs';

/**
 * Escape shell arguments to prevent injection
 * Wraps special characters that could be interpreted by shell
 */
export function escapeShellArg(arg) {
  if (typeof arg !== 'string') {
    throw new TypeError('Argument must be a string');
  }
  // Replace backslashes first, then single quotes
  return arg
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\"'\"'");
}

/**
 * Logger with color-coded prefixes
 */
export function log(type, message) {
  const prefix = {
    info: `${COLORS.green}[ollama]${COLORS.reset}`,
    warn: `${COLORS.yellow}[ollama]${COLORS.reset}`,
    error: `${COLORS.red}[ollama]${COLORS.reset}`,
    model: `${COLORS.blue}[ollama]${COLORS.reset}`,
    perf: `${COLORS.cyan}[ollama]${COLORS.reset}`
  }[type] || '[ollama]';
  console.log(`${prefix} ${message}`);
}

/**
 * Map short model names to full names
 */
export function resolveModelName(shortName) {
  const modelMap = {
    'kimi': 'kimi-k2.6:cloud',
    'glm': 'glm-5.1:cloud',
    'glm-5': 'glm-5.1:cloud',
    'glm-5.1': 'glm-5.1:cloud',
    'gemma': 'gemma4:31b-cloud',
    'gemma4': 'gemma4:31b-cloud',
    'qwen': 'qwen3.5:397b-cloud',
    'qwen3.5': 'qwen3.5:397b-cloud'
  };
  return modelMap[shortName] || `${shortName}:cloud`;
}

/**
 * Parse CLI arguments using util.parseArgs
 * Returns { args, flags, positionals }
 */
export function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = {};
  const positionals = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const flagName = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith('--')) {
        flags[flagName] = nextArg;
        i++;
      } else {
        flags[flagName] = true;
      }
    } else {
      positionals.push(arg);
    }
  }

  return { args, flags, positionals };
}

/**
 * Retry wrapper with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {Function} options.onRetry - Callback on retry (error, attempt) => void
 * @returns {Promise} - Result of fn
 */
export async function withRetry(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 1000, onRetry } = options;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      if (onRetry) {
        onRetry(error, attempt + 1);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
