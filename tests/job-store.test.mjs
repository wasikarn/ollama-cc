#!/usr/bin/env node
/**
 * Tests for job-store.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// We need to test job-store functions. Since it uses a hardcoded path,
// we'll test the exported functions directly.
import {
  createJob,
  getJob,
  updateJob,
  listJobs,
  markJobRunning,
  markJobCompleted,
  markJobFailed,
  getJobStats
} from '../scripts/lib/job-store.mjs';

describe('job-store', () => {
  it('creates a job with required fields', () => {
    const job = createJob('panel', { prompt: 'test', options: {} });
    assert.ok(job.id);
    assert.strictEqual(job.type, 'panel');
    assert.strictEqual(job.status, 'pending');
    assert.ok(job.createdAt);
    assert.ok(job.updatedAt);
    assert.strictEqual(job.prompt, 'test');
  });

  it('retrieves a created job', () => {
    const job = createJob('test', { prompt: 'retrieve test' });
    const retrieved = getJob(job.id);
    assert.ok(retrieved);
    assert.strictEqual(retrieved.id, job.id);
    assert.strictEqual(retrieved.prompt, 'retrieve test');
  });

  it('returns null for non-existent job', () => {
    const result = getJob('non-existent-id-12345');
    assert.strictEqual(result, null);
  });

  it('updates a job', () => {
    const job = createJob('test', { prompt: 'update test' });
    const updated = updateJob(job.id, { status: 'running' });
    assert.strictEqual(updated.status, 'running');
    assert.ok(updated.updatedAt >= job.updatedAt);
  });

  it('marks job as running', () => {
    const job = createJob('test', { prompt: 'running test' });
    const updated = markJobRunning(job.id);
    assert.strictEqual(updated.status, 'running');
  });

  it('marks job as completed with results', () => {
    const job = createJob('test', { prompt: 'completed test' });
    const results = { consensus: { averageAgreement: 85 } };
    const updated = markJobCompleted(job.id, results);
    assert.strictEqual(updated.status, 'completed');
    assert.deepStrictEqual(updated.results, results);
  });

  it('marks job as failed', () => {
    const job = createJob('test', { prompt: 'failed test' });
    const updated = markJobFailed(job.id, new Error('something broke'));
    assert.strictEqual(updated.status, 'failed');
    assert.ok(updated.error);
  });

  it('lists jobs', () => {
    const before = listJobs().length;
    createJob('test', { prompt: 'list test' });
    const after = listJobs().length;
    assert.strictEqual(after, before + 1);
  });

  it('filters jobs by status', () => {
    const job = createJob('test', { prompt: 'filter test' });
    markJobRunning(job.id);
    const running = listJobs('running');
    assert.ok(running.some(j => j.id === job.id));
  });

  it('returns job statistics', () => {
    const stats = getJobStats();
    assert.ok(typeof stats.total === 'number');
    assert.ok(typeof stats.pending === 'number');
    assert.ok(typeof stats.running === 'number');
    assert.ok(typeof stats.completed === 'number');
    assert.ok(typeof stats.failed === 'number');
  });

  it('updates return null for non-existent job', () => {
    const result = updateJob('non-existent', { status: 'running' });
    assert.strictEqual(result, null);
  });
});
