#!/usr/bin/env node
/**
 * OMO - Response Cache
 * File-based caching with in-memory LRU layer for fast repeated lookups
 */

import { createHash } from 'crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { LRUCache } from './lru-cache.mjs';

const CACHE_DIR = join(homedir(), '.ollama-cc', 'cache');
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

// Shared in-memory LRU cache (max 100 entries, 1h TTL)
const memoryCache = new LRUCache({ maxSize: 100, ttlMs: DEFAULT_TTL_MS });

/**
 * Ensure cache directory exists
 */
function ensureCacheDir() {
  mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Generate cache key from model + prompt
 */
function generateKey(model, prompt) {
  return createHash('sha256').update(`${model}:${prompt}`).digest('hex').slice(0, 16);
}

/**
 * Get cache file path
 */
function getCachePath(key) {
  return join(CACHE_DIR, `${key}.json`);
}

/**
 * Get cached response if valid (memory-first, then disk)
 * @param {string} model - Model name
 * @param {string} prompt - Prompt text
 * @param {number} ttlMs - TTL in milliseconds
 * @returns {object|null} Cached entry or null
 */
export function getCachedResponse(model, prompt, ttlMs = DEFAULT_TTL_MS) {
  const key = generateKey(model, prompt);

  // Layer 1: In-memory cache
  const memEntry = memoryCache.get(key);
  if (memEntry) {
    const age = Date.now() - memEntry.timestampMs;
    // Respect TTL parameter even for memory entries
    if (ttlMs <= 0 || (age > ttlMs && age >= 0)) {
      memoryCache.delete(key);
      return null;
    }
    return {
      ...memEntry,
      cached: true,
      cacheAge: age
    };
  }

  // Layer 2: File cache
  ensureCacheDir();
  const cachePath = getCachePath(key);

  if (!existsSync(cachePath)) return null;

  try {
    const stats = statSync(cachePath);
    const age = Date.now() - stats.mtimeMs;
    // TTL <= 0 means "always expired"; negative age is treated as fresh (fs precision)
    if (ttlMs <= 0 || (age > ttlMs && age >= 0)) {
      unlinkSync(cachePath);
      return null;
    }

    const content = readFileSync(cachePath, 'utf-8');
    const entry = JSON.parse(content);

    // Validate entry structure (empty string is valid output)
    if (typeof entry.output !== 'string') {
      unlinkSync(cachePath);
      return null;
    }

    // Promote to memory cache
    memoryCache.set(key, entry);

    return {
      ...entry,
      cached: true,
      cacheAge: age
    };
  } catch {
    // Invalid cache file
    try { unlinkSync(cachePath); } catch {}
    return null;
  }
}

/**
 * Store response in cache (memory + disk)
 * @param {string} model - Model name
 * @param {string} prompt - Prompt text
 * @param {object} response - Response object (must have `output` field)
 */
export function setCachedResponse(model, prompt, response) {
  const key = generateKey(model, prompt);

  const entry = {
    model,
    prompt: prompt.slice(0, 200), // Truncated for debugging
    output: response.output,
    timestamp: new Date().toISOString(),
    timestampMs: Date.now()
  };

  // Layer 1: Write to memory
  memoryCache.set(key, entry);

  // Layer 2: Write to file (async background — fire and forget)
  ensureCacheDir();
  const cachePath = getCachePath(key);
  try {
    writeFileSync(cachePath, JSON.stringify(entry, null, 2));
  } catch {
    // Best-effort: memory cache is primary; file is secondary
  }
}

/**
 * Clear all cached responses (memory + disk)
 * @returns {number} Number of files removed
 */
export function clearCache() {
  // Clear memory
  memoryCache.clear();

  // Clear disk
  ensureCacheDir();
  const files = readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
  let removed = 0;

  for (const file of files) {
    try {
      unlinkSync(join(CACHE_DIR, file));
      removed++;
    } catch {
      // Skip files we can't remove
    }
  }

  return removed;
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  ensureCacheDir();

  const files = readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
  let totalSize = 0;
  let count = 0;

  for (const file of files) {
    try {
      const stats = statSync(join(CACHE_DIR, file));
      totalSize += stats.size;
      count++;
    } catch {
      // Skip unreadable files
    }
  }

  return {
    memory: memoryCache.getStats(),
    disk: { count, totalSize, dir: CACHE_DIR }
  };
}
