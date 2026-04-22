#!/usr/bin/env node
/**
 * OMO - LRU In-Memory Cache
 * Fast in-memory layer on top of file cache
 */

export class LRUCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.ttlMs = options.ttlMs || 60 * 60 * 1000; // 1 hour default
    this.map = new Map(); // Map preserves insertion order → natural LRU
  }

  /**
   * Get value by key
   * Returns null if missing or expired
   */
  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;

    // Expired → evict
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }

    // Touch → move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  /**
   * Set value by key
   */
  set(key, value) {
    // Evict if at capacity
    if (this.map.size >= this.maxSize && !this.map.has(key)) {
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }

    // Remove old entry if exists (will re-insert at end)
    this.map.delete(key);
    this.map.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  /**
   * Delete key
   */
  delete(key) {
    this.map.delete(key);
  }

  /**
   * Clear all entries
   */
  clear() {
    this.map.clear();
  }

  /**
   * Get stats
   */
  getStats() {
    let expired = 0;
    const now = Date.now();
    for (const [, entry] of this.map) {
      if (now > entry.expiresAt) expired++;
    }
    return {
      size: this.map.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
      expired
    };
  }
}
