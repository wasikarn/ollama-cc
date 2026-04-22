#!/usr/bin/env node
/**
 * Tests for circuit-breaker.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createCircuitBreaker, CircuitBreakerOpenError, getBreaker, getAllBreakerStatuses, deleteBreaker, clearAllBreakers } from '../scripts/lib/circuit-breaker.mjs';

describe('createCircuitBreaker', () => {
  it('allows calls when CLOSED (default)', async () => {
    const breaker = createCircuitBreaker({ name: 'test-closed' });
    const result = await breaker.execute(() => Promise.resolve(42));
    assert.strictEqual(result, 42);
    assert.strictEqual(breaker.state, 'CLOSED');
  });

  it('trips to OPEN after threshold failures', async () => {
    const breaker = createCircuitBreaker({ name: 'test-trip', failureThreshold: 3, timeoutMs: 10000 });

    // 3 failures
    await assert.rejects(breaker.execute(() => Promise.reject(new Error('fail 1'))));
    await assert.rejects(breaker.execute(() => Promise.reject(new Error('fail 2'))));
    await assert.rejects(breaker.execute(() => Promise.reject(new Error('fail 3'))));

    assert.strictEqual(breaker.state, 'OPEN');

    // Next call should fail immediately with CircuitBreakerOpenError
    await assert.rejects(
      breaker.execute(() => Promise.resolve(42)),
      CircuitBreakerOpenError
    );
  });

  it('transitions HALF_OPEN after timeout', async () => {
    const breaker = createCircuitBreaker({ name: 'test-half', failureThreshold: 1, timeoutMs: 50 });

    await assert.rejects(breaker.execute(() => Promise.reject(new Error('fail'))));
    assert.strictEqual(breaker.state, 'OPEN');

    // Wait for timeout
    await new Promise(r => setTimeout(r, 80));

    // Should transition to HALF_OPEN and allow call
    const result = await breaker.execute(() => Promise.resolve(42));
    assert.strictEqual(result, 42);
    assert.strictEqual(breaker.state, 'CLOSED');
  });

  it('returns to OPEN from HALF_OPEN on failure', async () => {
    const breaker = createCircuitBreaker({ name: 'test-half-fail', failureThreshold: 1, timeoutMs: 50 });

    await assert.rejects(breaker.execute(() => Promise.reject(new Error('fail'))));
    await new Promise(r => setTimeout(r, 80));

    // HALF_OPEN call fails
    await assert.rejects(breaker.execute(() => Promise.reject(new Error('fail again'))));
    assert.strictEqual(breaker.state, 'OPEN');
  });

  it('tracks status correctly', async () => {
    const breaker = createCircuitBreaker({ name: 'test-status', failureThreshold: 2 });
    assert.strictEqual(breaker.getStatus().totalCalls, 0);

    await breaker.execute(() => Promise.resolve(1));
    assert.strictEqual(breaker.getStatus().totalCalls, 1);

    await assert.rejects(breaker.execute(() => Promise.reject(new Error('fail'))));
    assert.strictEqual(breaker.getStatus().totalFailures, 1);
  });

  it('supports manual forceOpen/forceClose', async () => {
    const breaker = createCircuitBreaker({ name: 'test-manual' });

    breaker.forceOpen();
    assert.strictEqual(breaker.state, 'OPEN');
    await assert.rejects(breaker.execute(() => Promise.resolve(1)), CircuitBreakerOpenError);

    breaker.forceClose();
    assert.strictEqual(breaker.state, 'CLOSED');
    const result = await breaker.execute(() => Promise.resolve(1));
    assert.strictEqual(result, 1);
  });

  it('limits half-open calls', async () => {
    const breaker = createCircuitBreaker({
      name: 'test-half-limit',
      failureThreshold: 1,
      timeoutMs: 50,
      halfOpenMaxCalls: 1
    });

    await assert.rejects(breaker.execute(() => Promise.reject(new Error('fail'))));
    await new Promise(r => setTimeout(r, 80));

    // First HALF_OPEN call
    await breaker.execute(() => Promise.resolve(1));

    // Should be CLOSED now
    assert.strictEqual(breaker.state, 'CLOSED');
  });
});

describe('CircuitBreakerOpenError', () => {
  it('has correct properties', () => {
    const err = new CircuitBreakerOpenError('test', 5000);
    assert.ok(err.message.includes('test'));
    assert.ok(err.message.includes('OPEN'));
    assert.strictEqual(err.breakerName, 'test');
    assert.strictEqual(err.retryAfterMs, 5000);
  });
});

describe('breaker registry cleanup', () => {
  it('deletes a breaker by name', () => {
    clearAllBreakers();
    const b = getBreaker('cleanup-test');
    assert.ok(b);
    assert.strictEqual(deleteBreaker('cleanup-test'), true);
    assert.strictEqual(deleteBreaker('cleanup-test'), false);
  });

  it('clears all breakers', () => {
    getBreaker('b1');
    getBreaker('b2');
    assert.ok(getAllBreakerStatuses().length >= 2);
    clearAllBreakers();
    assert.strictEqual(getAllBreakerStatuses().length, 0);
  });
});
