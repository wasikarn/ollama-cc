#!/usr/bin/env node
/**
 * OMO - Ephemeral Background Runner
 * One-shot background process: spawn, run job, update status, exit.
 * No persistent daemon. Aligns with OMC "spawn on demand, die when done" pattern.
 */

import { spawn } from 'child_process';
import { createJob, markJobRunning, markJobCompleted, markJobFailed } from './job-store.mjs';

/**
 * Spawn a one-shot background process for a job.
 * Returns immediately with jobId. The child process handles execution.
 */
export async function spawnBackground(type, data) {
  const job = createJob(type, data);

  const child = spawn(
    process.execPath,
    [
      new URL('../background-runner.mjs', import.meta.url).pathname,
      job.id
    ],
    {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore']
    }
  );

  child.unref();

  return { jobId: job.id, pid: child.pid };
}

/**
 * Execute a job directly (called by background-runner.mjs).
 */
export async function executeJob(jobId) {
  const { getJob } = await import('./job-store.mjs');
  const job = getJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  markJobRunning(jobId);

  try {
    let results;

    switch (job.type) {
      case 'panel':
        results = await executePanelJob(job);
        break;
      case 'swarm':
        results = await executeSwarmJob(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    markJobCompleted(jobId, results);
    return { success: true, jobId };
  } catch (error) {
    markJobFailed(jobId, error.message || 'Unknown error');
    return { success: false, jobId, error: error.message };
  }
}

async function executePanelJob(job) {
  const { debateMode } = await import('../panel.mjs');
  await debateMode(job.prompt, {
    tier: job.options?.tier || 'standard',
    format: job.options?.format || 'text'
  });
  return { completedAt: new Date().toISOString() };
}

async function executeSwarmJob(job) {
  const { teamMode } = await import('../swarm.mjs');
  await teamMode(
    job.options?.spec,
    job.options?.model,
    job.options?.task,
    {
      ensemble: job.options?.ensemble || false,
      format: job.options?.format || 'text'
    }
  );
  return { completedAt: new Date().toISOString() };
}
