#!/usr/bin/env node
/**
 * Tests for cache.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getCachedResponse, setCachedResponse, clearCache, getCacheStats } from '../scripts/lib/cache.mjs';

describe('cache', () => {
  const testModel = 'test-model:cache';
  const testPrompt = 'This is a test prompt for caching';
  const testResponse = { output: 'Test response content' };

  it('returns null for uncached prompt', () => {
    const result = getCachedResponse(testModel, testPrompt + Math.random());
    assert.strictEqual(result, null);
  });

  it('stores and retrieves cached response', () => {
    setCachedResponse(testModel, testPrompt, testResponse);
    const result = getCachedResponse(testModel, testPrompt);
    assert.ok(result);
    assert.strictEqual(result.output, testResponse.output);
    assert.strictEqual(result.cached, true);
    assert.ok(typeof result.cacheAge === 'number');
  });

  it('returns different cache entries for different prompts', () => {
    const prompt1 = 'prompt one';
    const prompt2 = 'prompt two';
    setCachedResponse(testModel, prompt1, { output: 'response one' });
    setCachedResponse(testModel, prompt2, { output: 'response two' });

    const result1 = getCachedResponse(testModel, prompt1);
    const result2 = getCachedResponse(testModel, prompt2);

    assert.strictEqual(result1.output, 'response one');
    assert.strictEqual(result2.output, 'response two');
  });

  it('returns different cache entries for different models with same prompt', () => {
    const sharedPrompt = 'shared prompt';
    setCachedResponse('model-a', sharedPrompt, { output: 'a' });
    setCachedResponse('model-b', sharedPrompt, { output: 'b' });

    const resultA = getCachedResponse('model-a', sharedPrompt);
    const resultB = getCachedResponse('model-b', sharedPrompt);

    assert.strictEqual(resultA.output, 'a');
    assert.strictEqual(resultB.output, 'b');
  });

  it('expires old entries with short TTL', () => {
    const prompt = 'ttl test prompt';
    setCachedResponse(testModel, prompt, { output: 'ttl test' });

    // Should exist with default TTL
    const fresh = getCachedResponse(testModel, prompt, 3600000);
    assert.ok(fresh);

    // Should not exist with 0 TTL
    const expired = getCachedResponse(testModel, prompt, 0);
    assert.strictEqual(expired, null);
  });

  it('clears all cache entries', () => {
    setCachedResponse(testModel, 'clear-test-1', { output: '1' });
    setCachedResponse(testModel, 'clear-test-2', { output: '2' });

    const removed = clearCache();
    assert.ok(removed >= 2);

    const result1 = getCachedResponse(testModel, 'clear-test-1');
    const result2 = getCachedResponse(testModel, 'clear-test-2');
    assert.strictEqual(result1, null);
    assert.strictEqual(result2, null);
  });

  it('returns cache statistics', () => {
    clearCache();
    setCachedResponse(testModel, 'stats-test', { output: 'stats' });

    const stats = getCacheStats();
    assert.ok(stats.count >= 1);
    assert.ok(stats.totalSize > 0);
    assert.ok(stats.dir.includes('.ollama-cc'));
  });

  it('handles empty output gracefully', () => {
    const prompt = 'empty-output-test';
    setCachedResponse(testModel, prompt, { output: '' });

    const result = getCachedResponse(testModel, prompt);
    assert.ok(result);
    assert.strictEqual(result.output, '');
  });
});
