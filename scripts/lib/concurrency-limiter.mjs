#!/usr/bin/env node
/**
 * OMO - Concurrency Limiter (Bulkhead Pattern)
 * Prevents overwhelming Ollama by limiting concurrent calls
 */

export class ConcurrencyLimiter {
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  /**
   * Execute async function with concurrency limit
   * @param {Function} fn - Async function to execute
   * @returns {Promise} Result of fn
   */
  async execute(fn) {
    // Wait until slot available
    while (this.running >= this.maxConcurrent) {
      await new Promise(resolve => this.queue.push(resolve));
    }

    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      // Wake next waiter
      const next = this.queue.shift();
      if (next) next();
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent
    };
  }
}
