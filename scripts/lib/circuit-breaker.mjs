#!/usr/bin/env node
/**
 * OMO - Circuit Breaker
 * State-machine proxy to prevent cascading failures when Ollama is down/overloaded
 * States: CLOSED → OPEN → HALF_OPEN → CLOSED (or back to OPEN)
 */

import { log } from './utils.mjs';

const STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

/**
 * Create a circuit breaker for async functions
 * @param {Object} options
 * @param {number} options.failureThreshold - Failures to trip (default: 5)
 * @param {number} options.timeoutMs - Time in OPEN before HALF_OPEN (default: 30000)
 * @param {number} options.halfOpenMaxCalls - Max calls allowed in HALF_OPEN (default: 2)
 * @param {string} options.name - Breaker name for logging
 */
export function createCircuitBreaker(options = {}) {
  const {
    failureThreshold = 5,
    timeoutMs = 30000,
    halfOpenMaxCalls = 2,
    name = 'breaker'
  } = options;

  let state = STATE.CLOSED;
  let failureCount = 0;
  let lastFailureTime = null;
  let halfOpenCalls = 0;
  let totalCalls = 0;
  let totalFailures = 0;

  /**
   * Transition to a new state
   */
  function transitionTo(newState) {
    if (state === newState) return;
    log('warn', `[${name}] ${state} → ${newState}`);
    state = newState;
  }

  /**
   * Execute a function through the breaker
   */
  async function execute(fn) {
    totalCalls++;

    if (state === STATE.OPEN) {
      if (Date.now() - lastFailureTime > timeoutMs) {
        transitionTo(STATE.HALF_OPEN);
        halfOpenCalls = 0;
      } else {
        totalFailures++;
        throw new CircuitBreakerOpenError(name, timeoutMs - (Date.now() - lastFailureTime));
      }
    }

    if (state === STATE.HALF_OPEN) {
      if (halfOpenCalls >= halfOpenMaxCalls) {
        totalFailures++;
        throw new CircuitBreakerOpenError(name, 0);
      }
      halfOpenCalls++;
    }

    try {
      const result = await fn();
      onSuccess();
      return result;
    } catch (error) {
      onFailure();
      throw error;
    }
  }

  /**
   * Record success
   */
  function onSuccess() {
    failureCount = 0;

    if (state === STATE.HALF_OPEN) {
      transitionTo(STATE.CLOSED);
      halfOpenCalls = 0;
    }
  }

  /**
   * Record failure
   */
  function onFailure() {
    failureCount++;
    totalFailures++;
    lastFailureTime = Date.now();

    if (state === STATE.HALF_OPEN) {
      transitionTo(STATE.OPEN);
      return;
    }

    if (failureCount >= failureThreshold) {
      transitionTo(STATE.OPEN);
    }
  }

  /**
   * Force breaker open (manual override)
   */
  function forceOpen() {
    transitionTo(STATE.OPEN);
    lastFailureTime = Date.now();
  }

  /**
   * Force breaker closed (manual override)
   */
  function forceClose() {
    transitionTo(STATE.CLOSED);
    failureCount = 0;
    halfOpenCalls = 0;
  }

  /**
   * Get current status
   */
  function getStatus() {
    return {
      name,
      state,
      failureCount,
      failureThreshold,
      timeoutMs,
      lastFailureTime,
      halfOpenCalls,
      halfOpenMaxCalls,
      totalCalls,
      totalFailures
    };
  }

  return {
    execute,
    forceOpen,
    forceClose,
    getStatus,
    get state() { return state; }
  };
}

/**
 * Error thrown when breaker is OPEN
 */
export class CircuitBreakerOpenError extends Error {
  constructor(name, retryAfterMs) {
    super(`Circuit breaker '${name}' is OPEN. Retry after ${retryAfterMs}ms.`);
    this.name = 'CircuitBreakerOpenError';
    this.breakerName = name;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Global breaker registry for shared state across calls
 */
const GLOBAL_BREAKERS = new Map();

/**
 * Get or create a shared breaker by name
 */
export function getBreaker(name, options = {}) {
  if (!GLOBAL_BREAKERS.has(name)) {
    GLOBAL_BREAKERS.set(name, createCircuitBreaker({ name, ...options }));
  }
  return GLOBAL_BREAKERS.get(name);
}

/**
 * Get all breaker statuses
 */
export function getAllBreakerStatuses() {
  return Array.from(GLOBAL_BREAKERS.entries()).map(([name, breaker]) => ({
    name,
    ...breaker.getStatus()
  }));
}

/**
 * Delete a breaker from the global registry
 */
export function deleteBreaker(name) {
  return GLOBAL_BREAKERS.delete(name);
}

/**
 * Clear all breakers from the global registry
 */
export function clearAllBreakers() {
  GLOBAL_BREAKERS.clear();
}
