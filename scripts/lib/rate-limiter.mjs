#!/usr/bin/env node
/**
 * OMO - Rate Limiter (Token Bucket)
 * Prevents burst requests from overwhelming Ollama
 */

export class TokenBucket {
  constructor(options = {}) {
    this.capacity = options.capacity || 10;
    this.tokens = this.capacity;
    this.refillRate = options.refillRate || 1; // tokens per second
    this.maxQueueSize = options.maxQueueSize || 100;
    this.lastRefill = Date.now();
    this.waitQueue = [];
    this._refillTimer = null;
    this._destroyed = false;
  }

  /**
   * Refill tokens based on elapsed time
   */
  _refill() {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    const tokensToAdd = (elapsedMs / 1000) * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Acquire a token (blocks if none available)
   * @returns {Promise} Resolves when token acquired
   * @throws {Error} If bucket is destroyed or queue is full
   */
  async acquire() {
    if (this._destroyed) {
      throw new Error('TokenBucket has been destroyed');
    }

    this._refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Guard against unbounded queue growth
    if (this.waitQueue.length >= this.maxQueueSize) {
      throw new Error(`Rate limiter queue full (${this.maxQueueSize}) — too many concurrent requests`);
    }

    // Wait for token
    return new Promise((resolve, reject) => {
      this.waitQueue.push({ resolve, reject });
      this._scheduleRefillCheck();
    });
  }

  /**
   * Try to acquire without blocking
   * @returns {boolean} true if token acquired
   */
  tryAcquire() {
    if (this._destroyed) return false;
    this._refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Schedule next refill check
   */
  _scheduleRefillCheck() {
    if (this._refillTimer || this._destroyed) return;

    const tokensNeeded = 1 - this.tokens;
    const msUntilRefill = (tokensNeeded / this.refillRate) * 1000;

    this._refillTimer = setTimeout(() => {
      this._refillTimer = null;
      if (this._destroyed) return;

      this._refill();

      while (this.tokens >= 1 && this.waitQueue.length > 0) {
        this.tokens -= 1;
        const { resolve } = this.waitQueue.shift();
        resolve();
      }

      if (this.waitQueue.length > 0) {
        this._scheduleRefillCheck();
      }
    }, Math.min(msUntilRefill, 1000));
  }

  /**
   * Destroy the bucket: reject all waiters and clear timers
   */
  destroy() {
    this._destroyed = true;
    if (this._refillTimer) {
      clearTimeout(this._refillTimer);
      this._refillTimer = null;
    }
    while (this.waitQueue.length > 0) {
      const { reject } = this.waitQueue.shift();
      reject(new Error('TokenBucket destroyed'));
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    this._refill();
    return {
      tokens: this.tokens,
      capacity: this.capacity,
      refillRate: this.refillRate,
      waiting: this.waitQueue.length,
      maxQueueSize: this.maxQueueSize,
      destroyed: this._destroyed
    };
  }
}
