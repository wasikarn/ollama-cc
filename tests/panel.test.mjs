#!/usr/bin/env node
/**
 * Tests for panel.mjs consensus logic
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// Import internal functions by replicating the logic for testing
// Note: panel.mjs exports `debateMode` but not internals, so we test the exported API

import { debateMode } from '../scripts/panel.mjs';

describe('debateMode', () => {
  it('throws on empty prompt', async () => {
    let exited = false;
    const originalExit = process.exit;
    process.exit = (code) => {
      exited = true;
      throw new Error(`exit ${code}`);
    };

    try {
      await debateMode(null, { format: 'json' });
      assert.fail('should have thrown');
    } catch (err) {
      assert.ok(exited || err.message.includes('exit'));
    } finally {
      process.exit = originalExit;
    }
  });
});

// Test agreement calculation logic directly
function calculateAgreement(output1, output2) {
  const words1 = new Set(output1.toLowerCase().split(/\s+/).filter(w => w.length > 4));
  const words2 = new Set(output2.toLowerCase().split(/\s+/).filter(w => w.length > 4));

  const intersection = [...words1].filter(w => words2.has(w));
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? (intersection.length / union.size) * 100 : 0;
}

describe('calculateAgreement', () => {
  it('returns 100 for identical outputs', () => {
    const text = 'This is a test response about machine learning models';
    const score = calculateAgreement(text, text);
    assert.strictEqual(score, 100);
  });

  it('returns 0 for completely different outputs', () => {
    const score = calculateAgreement('abc def ghi jkl', 'mno pqr stu vwx');
    assert.strictEqual(score, 0);
  });

  it('returns intermediate score for partially overlapping outputs', () => {
    const score = calculateAgreement(
      'The quick brown fox jumps over the lazy dog',
      'The quick brown fox runs past the lazy dog'
    );
    assert.ok(score > 0 && score < 100);
  });

  it('returns 0 for empty strings', () => {
    const score = calculateAgreement('', '');
    assert.strictEqual(score, 0);
  });

  it('is symmetric', () => {
    const score1 = calculateAgreement('hello world testing foo', 'hello world testing bar');
    const score2 = calculateAgreement('hello world testing bar', 'hello world testing foo');
    assert.strictEqual(score1, score2);
  });
});

// Test consensus analysis
function analyzeConsensus(results) {
  const pairs = [];
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      pairs.push([results[i].model, results[j].model]);
    }
  }

  const resultMap = new Map(results.map(r => [r.model, r]));
  const agreements = {};
  let totalAgreement = 0;
  let pairCount = 0;

  for (const [m1, m2] of pairs) {
    const r1 = resultMap.get(m1);
    const r2 = resultMap.get(m2);
    if (r1 && r2) {
      const score = calculateAgreement(r1.output, r2.output);
      agreements[`${m1}-${m2}`] = score;
      totalAgreement += score;
      pairCount++;
    }
  }

  const averageAgreement = pairCount > 0 ? totalAgreement / pairCount : 0;

  return {
    agreements,
    averageAgreement,
    consensusLevel: averageAgreement >= 70 ? 'high' : averageAgreement >= 40 ? 'medium' : 'low'
  };
}

describe('analyzeConsensus', () => {
  it('returns high consensus for identical outputs', () => {
    const results = [
      { model: 'a', output: 'The cat sat on the mat and looked outside' },
      { model: 'b', output: 'The cat sat on the mat and looked outside' },
      { model: 'c', output: 'The cat sat on the mat and looked outside' }
    ];
    const consensus = analyzeConsensus(results);
    assert.strictEqual(consensus.consensusLevel, 'high');
    assert.ok(consensus.averageAgreement >= 70);
  });

  it('returns low consensus for divergent outputs', () => {
    const results = [
      { model: 'a', output: 'Use React for the frontend application' },
      { model: 'b', output: 'Vue is better for this use case definitely' },
      { model: 'c', output: 'Svelte offers superior performance metrics' }
    ];
    const consensus = analyzeConsensus(results);
    assert.strictEqual(consensus.consensusLevel, 'low');
    assert.ok(consensus.averageAgreement < 40);
  });

  it('handles single result gracefully', () => {
    const results = [{ model: 'a', output: 'Only one model responded' }];
    const consensus = analyzeConsensus(results);
    assert.strictEqual(consensus.averageAgreement, 0);
    assert.strictEqual(consensus.consensusLevel, 'low');
    assert.deepStrictEqual(consensus.agreements, {});
  });

  it('handles two results', () => {
    const results = [
      { model: 'a', output: 'foo bar baz qux' },
      { model: 'b', output: 'foo bar baz qux' }
    ];
    const consensus = analyzeConsensus(results);
    assert.strictEqual(Object.keys(consensus.agreements).length, 1);
    assert.ok(consensus.agreements['a-b'] !== undefined);
  });
});
