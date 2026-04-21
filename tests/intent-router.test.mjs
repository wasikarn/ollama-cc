#!/usr/bin/env node
/**
 * Tests for intent-router.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  classifyIntent,
  detectModelFromIntent,
  detectComplexity,
  adjustModelByComplexity,
  getPromptTemplate,
  batchClassify
} from '../scripts/lib/intent-router.mjs';

describe('classifyIntent', () => {
  it('classifies DEBUG intent from debugging keywords', () => {
    const result = classifyIntent('debug why this function crashes');
    assert.strictEqual(result.intent, 'DEBUG');
    assert.ok(result.confidence > 0);
  });

  it('classifies IMPLEMENT intent from coding keywords', () => {
    const result = classifyIntent('write a function to sort an array');
    assert.strictEqual(result.intent, 'IMPLEMENT');
    assert.ok(result.confidence > 0);
  });

  it('classifies DESIGN intent from architecture keywords', () => {
    const result = classifyIntent('design a microservices architecture');
    assert.strictEqual(result.intent, 'DESIGN');
    assert.ok(result.confidence > 0);
  });

  it('classifies EXPLAIN intent from explanation keywords', () => {
    const result = classifyIntent('explain how async await works');
    assert.strictEqual(result.intent, 'EXPLAIN');
    assert.ok(result.confidence > 0);
  });

  it('returns GENERAL for empty or vague prompts', () => {
    const result = classifyIntent('hello world');
    assert.strictEqual(result.intent, 'GENERAL');
  });

  it('handles null/undefined input gracefully', () => {
    const result = classifyIntent(null);
    assert.strictEqual(result.intent, 'UNKNOWN');
    assert.strictEqual(result.confidence, 0);
  });
});

describe('detectModelFromIntent', () => {
  it('routes debugging to glm-5.1', () => {
    const result = detectModelFromIntent('debug this error');
    assert.strictEqual(result.modelKey, 'glm-5.1');
    assert.strictEqual(result.intent, 'DEBUG');
  });

  it('routes visual tasks to kimi', () => {
    const result = detectModelFromIntent('convert this screenshot to react');
    assert.strictEqual(result.modelKey, 'kimi');
    assert.strictEqual(result.intent, 'VISUAL');
  });

  it('includes role description', () => {
    const result = detectModelFromIntent('refactor this code');
    assert.ok(result.roleDescription);
    assert.ok(result.role);
  });

  it('includes alternatives for ambiguous prompts', () => {
    const result = detectModelFromIntent('code review this function');
    assert.ok(Array.isArray(result.alternatives));
  });

  it('supports verbose mode', () => {
    const result = detectModelFromIntent('test this function', { verbose: true });
    assert.ok(result.classification);
    assert.ok(result.roleConfig);
  });
});

describe('detectComplexity', () => {
  it('returns simple for short basic prompts', () => {
    const result = detectComplexity('what is 2+2');
    assert.strictEqual(result.tier, 'simple');
    assert.ok(result.score >= 0);
  });

  it('returns complex for long technical prompts with code', () => {
    const prompt = `Design a distributed system with the following requirements:
    - Must handle 10M requests per second with async concurrency and distributed tracing
    - Use microservices architecture with kubernetes deployment and circuit breaker pattern
    - Implement database sharding, redis caching, and elasticsearch indexing
    - Add authentication via oauth and jwt tokens with rbac authorization
    - Use grpc for inter-service communication and protobuf for serialization
    - Add load balancer, reverse proxy, and cdn for performance optimization
    - Implement idempotency, atomicity, and consistency guarantees

    \`\`\`js
    class DistributedSystem {
      constructor(config) {
        this.shards = config.shards;
        this.replicas = config.replicas;
      }
      async route(request) {
        const shard = await this.consistentHash(request.id);
        return this.shards[shard].handle(request);
      }
    }
    \`\`\`

    Please provide a step-by-step proof of why this architecture satisfies the CAP theorem.
    I need a rigorous, formal analysis with mathematical justification.`;
    const result = detectComplexity(prompt);
    assert.strictEqual(result.tier, 'complex');
    assert.ok(result.factors.length > 0);
  });

  it('detects code blocks as complexity factor', () => {
    const prompt = '```js\nfunction foo() {\n  return bar;\n}\n```\nExplain this';
    const result = detectComplexity(prompt);
    assert.ok(result.score >= 3);
  });

  it('handles empty input', () => {
    const result = detectComplexity('');
    assert.strictEqual(result.tier, 'simple');
  });
});

describe('adjustModelByComplexity', () => {
  it('upgrades kimi to qwen for complex tasks', () => {
    const base = { modelKey: 'kimi', model: 'kimi-k2.6:cloud', reason: 'test', expertise: 'test' };
    const result = adjustModelByComplexity(base, { tier: 'complex', score: 7, factors: [] });
    assert.strictEqual(result.modelKey, 'qwen');
    assert.ok(result.complexityAdjusted);
  });

  it('downgrades glm-5.1 to kimi for simple tasks', () => {
    const base = { modelKey: 'glm-5.1', model: 'glm-5.1:cloud', reason: 'test', expertise: 'test' };
    const result = adjustModelByComplexity(base, { tier: 'simple', score: 0, factors: [] });
    assert.strictEqual(result.modelKey, 'kimi');
    assert.ok(result.complexityAdjusted);
  });

  it('leaves medium tasks unchanged', () => {
    const base = { modelKey: 'glm-5.1', model: 'glm-5.1:cloud', reason: 'test', expertise: 'test' };
    const result = adjustModelByComplexity(base, { tier: 'medium', score: 3, factors: [] });
    assert.strictEqual(result.modelKey, 'glm-5.1');
    assert.ok(!result.complexityAdjusted);
  });
});

describe('getPromptTemplate', () => {
  it('returns template for known intents', () => {
    const template = getPromptTemplate('DEBUG');
    assert.ok(template.includes('root cause'));
  });

  it('returns general template for unknown intents', () => {
    const template = getPromptTemplate('UNKNOWN');
    assert.ok(template.includes('helpful'));
  });
});

describe('batchClassify', () => {
  it('classifies multiple prompts', () => {
    const results = batchClassify(['debug this', 'design that', 'hello']);
    assert.strictEqual(results.length, 3);
    assert.ok(results[0].classification);
    assert.ok(results[0].prompt);
  });
});
