#!/usr/bin/env node
/**
 * OMO - Shared utilities
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
 * Classify error for retry strategy
 * Returns delay multiplier and whether to retry
 */
function classifyError(error) {
  const msg = (error?.message || '').toLowerCase();

  // Quota / rate limit → longer delay, still retry
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('too many requests')) {
    return { shouldRetry: true, delayMult: 4.0, type: 'quota' };
  }

  // Connection refused / spawn error → medium delay, retry
  if (msg.includes('econnrefused') || msg.includes('spawn') || msg.includes('connect') || msg.includes('enotfound')) {
    return { shouldRetry: true, delayMult: 2.0, type: 'connection' };
  }

  // Timeout → retry with same delay
  if (msg.includes('timeout') || msg.includes('etimedout')) {
    return { shouldRetry: true, delayMult: 1.5, type: 'timeout' };
  }

  // Exit code / process error → retry once
  if (msg.includes('exited with code') || msg.includes('process exited')) {
    return { shouldRetry: true, delayMult: 1.0, type: 'process' };
  }

  // Unknown → conservative retry
  return { shouldRetry: true, delayMult: 1.0, type: 'unknown' };
}

/**
 * Retry wrapper with exponential backoff + jitter + error classification
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {Function} options.onRetry - Callback on retry (error, attempt, delayMs) => void
 * @param {Function} options.logFn - Logger function (level, message) => void; defaults to console
 * @returns {Promise} - Result of fn
 */
export async function withRetry(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 1000, onRetry, logFn = log } = options;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const classification = classifyError(error);

      // Don't retry if classified as non-retryable (future extensibility)
      if (!classification.shouldRetry || attempt === maxRetries) {
        if (attempt === maxRetries) {
          logFn('error', `Failed after ${maxRetries + 1} attempts: ${error.message}`);
        }
        throw error;
      }

      // Exponential backoff with jitter: delay = baseDelay * 2^attempt * delayMult + jitter
      const exponential = Math.pow(2, attempt) * classification.delayMult;
      const jitter = Math.random() * 0.3 * baseDelay; // up to 30% jitter
      const delay = Math.round(baseDelay * exponential + jitter);

      // Log early retries as warn, final pre-throw as error
      const level = attempt < maxRetries - 1 ? 'warn' : 'warn';
      logFn(level, `Retry ${attempt + 1}/${maxRetries} (${classification.type}) — waiting ${delay}ms: ${error.message.slice(0, 80)}`);

      if (onRetry) {
        onRetry(error, attempt + 1, delay);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
