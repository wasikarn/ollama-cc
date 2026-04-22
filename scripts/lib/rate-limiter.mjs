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
    this.lastRefill = Date.now();
    this.waitQueue = [];
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
   */
  async acquire() {
    this._refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait for token
    return new Promise(resolve => {
      this.waitQueue.push(resolve);
      this._scheduleRefillCheck();
    });
  }

  /**
   * Try to acquire without blocking
   * @returns {boolean} true if token acquired
   */
  tryAcquire() {
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
    if (this._refillTimer) return;

    const tokensNeeded = 1 - this.tokens;
    const msUntilRefill = (tokensNeeded / this.refillRate) * 1000;

    this._refillTimer = setTimeout(() => {
      this._refillTimer = null;
      this._refill();

      while (this.tokens >= 1 && this.waitQueue.length > 0) {
        this.tokens -= 1;
        const resolve = this.waitQueue.shift();
        resolve();
      }

      if (this.waitQueue.length > 0) {
        this._scheduleRefillCheck();
      }
    }, Math.min(msUntilRefill, 1000));
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
      waiting: this.waitQueue.length
    };
  }
}
