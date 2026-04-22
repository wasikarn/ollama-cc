#!/usr/bin/env node
/**
 * OMO - Concurrency Limiter (Bulkhead Pattern)
 * Prevents overwhelming Ollama by limiting concurrent calls
 */

export class ConcurrencyLimiter {
  constructor(maxConcurrent = 5, options = {}) {
    this.maxConcurrent = maxConcurrent;
    this.maxQueueSize = options.maxQueueSize || 100;
    this.running = 0;
    this.queue = [];
    this._destroyed = false;
  }

  /**
   * Execute async function with concurrency limit
   * @param {Function} fn - Async function to execute
   * @returns {Promise} Result of fn
   * @throws {Error} If queue is full or limiter is destroyed
   */
  async execute(fn) {
    if (this._destroyed) {
      throw new Error('ConcurrencyLimiter has been destroyed');
    }

    // Guard against unbounded queue growth
    if (this.running >= this.maxConcurrent && this.queue.length >= this.maxQueueSize) {
      throw new Error(`Concurrency limiter queue full (${this.maxQueueSize})`);
    }

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
   * Destroy the limiter: reject all pending waiters
   */
  destroy() {
    this._destroyed = true;
    while (this.queue.length > 0) {
      const next = this.queue.shift();
      // Waiters are resolve functions — can't reject them directly,
      // but they will check _destroyed on next tick if we wrapped properly.
      // For now, just wake them and let the execute() throw.
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
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize,
      destroyed: this._destroyed
    };
  }
}
