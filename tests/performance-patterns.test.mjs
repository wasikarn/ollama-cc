#!/usr/bin/env node
/**
 * Tests for performance patterns: LRU cache, concurrency limiter, rate limiter
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LRUCache } from '../scripts/lib/lru-cache.mjs';
import { ConcurrencyLimiter } from '../scripts/lib/concurrency-limiter.mjs';
import { TokenBucket } from '../scripts/lib/rate-limiter.mjs';

describe('LRUCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LRUCache({ maxSize: 3, ttlMs: 60000 });
    cache.set('a', { output: 'hello' });
    const result = cache.get('a');
    assert.strictEqual(result.output, 'hello');
  });

  it('returns null for missing keys', () => {
    const cache = new LRUCache({ maxSize: 3, ttlMs: 60000 });
    assert.strictEqual(cache.get('missing'), null);
  });

  it('evicts oldest when at capacity', () => {
    const cache = new LRUCache({ maxSize: 2, ttlMs: 60000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // evicts 'a'

    assert.strictEqual(cache.get('a'), null);
    assert.strictEqual(cache.get('b'), 2);
    assert.strictEqual(cache.get('c'), 3);
  });

  it('updates LRU order on get', () => {
    const cache = new LRUCache({ maxSize: 2, ttlMs: 60000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // 'a' becomes most recent
    cache.set('c', 3); // evicts 'b', not 'a'

    assert.strictEqual(cache.get('a'), 1);
    assert.strictEqual(cache.get('b'), null);
  });

  it('expires entries after TTL', async () => {
    const cache = new LRUCache({ maxSize: 3, ttlMs: 50 });
    cache.set('a', 1);
    assert.strictEqual(cache.get('a'), 1);

    await new Promise(r => setTimeout(r, 80));
    assert.strictEqual(cache.get('a'), null);
  });

  it('returns correct stats', () => {
    const cache = new LRUCache({ maxSize: 5, ttlMs: 60000 });
    cache.set('a', 1);
    cache.set('b', 2);
    const stats = cache.getStats();
    assert.strictEqual(stats.size, 2);
    assert.strictEqual(stats.maxSize, 5);
    assert.strictEqual(stats.expired, 0);
  });
});

describe('ConcurrencyLimiter', () => {
  it('allows calls within limit', async () => {
    const limiter = new ConcurrencyLimiter(2);
    const results = await Promise.all([
      limiter.execute(() => Promise.resolve(1)),
      limiter.execute(() => Promise.resolve(2))
    ]);
    assert.deepStrictEqual(results, [1, 2]);
  });

  it('queues calls exceeding limit', async () => {
    const limiter = new ConcurrencyLimiter(1);
    let concurrent = 0;
    let maxConcurrent = 0;

    const task = async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise(r => setTimeout(r, 30));
      concurrent--;
      return 'done';
    };

    const results = await Promise.all([
      limiter.execute(task),
      limiter.execute(task),
      limiter.execute(task)
    ]);

    assert.strictEqual(maxConcurrent, 1);
    assert.deepStrictEqual(results, ['done', 'done', 'done']);
  });

  it('tracks status correctly', async () => {
    const limiter = new ConcurrencyLimiter(2);
    const status = limiter.getStatus();
    assert.strictEqual(status.running, 0);
    assert.strictEqual(status.queued, 0);
    assert.strictEqual(status.maxConcurrent, 2);

    const p = limiter.execute(() => new Promise(r => setTimeout(r, 50)));
    assert.strictEqual(limiter.getStatus().running, 1);

    await p;
    assert.strictEqual(limiter.getStatus().running, 0);
  });
});

describe('TokenBucket', () => {
  it('allows calls within capacity', () => {
    const bucket = new TokenBucket({ capacity: 3, refillRate: 1 });
    assert.strictEqual(bucket.tryAcquire(), true);
    assert.strictEqual(bucket.tryAcquire(), true);
    assert.strictEqual(bucket.tryAcquire(), true);
    assert.strictEqual(bucket.tryAcquire(), false);
  });

  it('refills tokens over time', async () => {
    const bucket = new TokenBucket({ capacity: 2, refillRate: 10 }); // 10 tokens/sec
    bucket.tryAcquire();
    bucket.tryAcquire(); // empty now

    assert.strictEqual(bucket.tryAcquire(), false);

    // Wait for refill
    await new Promise(r => setTimeout(r, 150));
    assert.strictEqual(bucket.tryAcquire(), true);
  });

  it('acquire blocks until token available', async () => {
    const bucket = new TokenBucket({ capacity: 1, refillRate: 10 });
    await bucket.acquire(); // take the only token

    const start = Date.now();
    await bucket.acquire(); // should wait for refill
    const elapsed = Date.now() - start;

    assert.ok(elapsed >= 50, `Expected to wait ~100ms, waited ${elapsed}ms`);
  });

  it('reports correct status', () => {
    const bucket = new TokenBucket({ capacity: 5, refillRate: 1 });
    bucket.tryAcquire();
    const status = bucket.getStatus();
    assert.strictEqual(status.tokens, 4);
    assert.strictEqual(status.capacity, 5);
    assert.strictEqual(status.waiting, 0);
  });

  it('rejects when queue is full', async () => {
    const bucket = new TokenBucket({ capacity: 1, refillRate: 0.001, maxQueueSize: 1 });
    bucket.tryAcquire(); // exhaust token

    // First waiter fills queue
    const p1 = bucket.acquire();

    // Second waiter should reject immediately
    await assert.rejects(
      bucket.acquire(),
      /queue full/
    );

    bucket.destroy();
    await assert.rejects(p1, /destroyed/);
  });

  it('rejects acquire on destroyed bucket', async () => {
    const bucket = new TokenBucket({ capacity: 1, refillRate: 1 });
    bucket.destroy();
    await assert.rejects(
      bucket.acquire(),
      /destroyed/
    );
  });
});

describe('ConcurrencyLimiter queue bounds', () => {
  it('rejects when queue exceeds maxQueueSize', async () => {
    const limiter = new ConcurrencyLimiter(1, { maxQueueSize: 1 });

    // First task occupies the slot
    const p1 = limiter.execute(() => new Promise(r => setTimeout(r, 200)));

    // Second task fills the queue
    const p2 = limiter.execute(() => Promise.resolve(2));

    // Third task should reject immediately
    await assert.rejects(
      limiter.execute(() => Promise.resolve(3)),
      /queue full/
    );

    await p1;
    await p2;
  });

  it('rejects execute on destroyed limiter', async () => {
    const limiter = new ConcurrencyLimiter(1);
    limiter.destroy();
    await assert.rejects(
      limiter.execute(() => Promise.resolve(1)),
      /destroyed/
    );
  });
});
