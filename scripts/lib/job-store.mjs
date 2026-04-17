#!/usr/bin/env node
/**
 * Ollama CC - Job Store
 * Job lifecycle management with JSON persistence
 * Jobs stored in ~/.ollama-cc/jobs/
 */

import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const JOBS_DIR = join(homedir(), '.ollama-cc', 'jobs');

/**
 * Ensure jobs directory exists
 */
function ensureJobsDir() {
  mkdirSync(JOBS_DIR, { recursive: true });
}

/**
 * Generate unique job ID
 */
function generateJobId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Get job file path
 */
function getJobPath(jobId) {
  return join(JOBS_DIR, `${jobId}.json`);
}

/**
 * Create a new job
 * @param {string} type - Job type: 'debate', 'team', 'smart'
 * @param {object} data - Job data including prompt, options, etc.
 * @returns {object} Created job
 */
export function createJob(type, data) {
  ensureJobsDir();

  const job = {
    id: generateJobId(),
    type,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data
  };

  writeFileSync(getJobPath(job.id), JSON.stringify(job, null, 2));
  return job;
}

/**
 * Update a job
 * @param {string} id - Job ID
 * @param {object} updates - Fields to update
 * @returns {object|null} Updated job or null if not found
 */
export function updateJob(id, updates) {
  const job = getJob(id);
  if (!job) return null;

  const updated = {
    ...job,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  writeFileSync(getJobPath(id), JSON.stringify(updated, null, 2));
  return updated;
}

/**
 * Get a job by ID
 * @param {string} id - Job ID
 * @returns {object|null} Job object or null if not found
 */
export function getJob(id) {
  const jobPath = getJobPath(id);
  if (!existsSync(jobPath)) return null;

  try {
    const content = readFileSync(jobPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * List all jobs, optionally filtered by status
 * @param {string} [status] - Optional status filter: 'pending', 'running', 'completed', 'failed'
 * @returns {object[]} Array of jobs
 */
export function listJobs(status = null) {
  ensureJobsDir();

  const files = readdirSync(JOBS_DIR).filter(f => f.endsWith('.json'));
  const jobs = [];

  for (const file of files) {
    try {
      const content = readFileSync(join(JOBS_DIR, file), 'utf-8');
      const job = JSON.parse(content);
      if (!status || job.status === status) {
        jobs.push(job);
      }
    } catch {
      // Skip invalid files
    }
  }

  // Sort by createdAt descending (newest first)
  return jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Clean up old jobs
 * @param {number} maxAgeDays - Maximum age in days
 * @returns {number} Number of jobs removed
 */
export function cleanupOldJobs(maxAgeDays = 7) {
  ensureJobsDir();

  const files = readdirSync(JOBS_DIR).filter(f => f.endsWith('.json'));
  const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
  let removed = 0;

  for (const file of files) {
    try {
      const filePath = join(JOBS_DIR, file);
      const stats = statSync(filePath);
      if (stats.mtimeMs < cutoffTime) {
        unlinkSync(filePath);
        removed++;
      }
    } catch {
      // Skip files we can't remove
    }
  }

  return removed;
}

/**
 * Mark job as running
 */
export function markJobRunning(id) {
  return updateJob(id, { status: 'running' });
}

/**
 * Mark job as completed with results
 */
export function markJobCompleted(id, results) {
  return updateJob(id, { status: 'completed', results });
}

/**
 * Mark job as failed with error
 */
export function markJobFailed(id, error) {
  return updateJob(id, {
    status: 'failed',
    error: error.message || error
  });
}

/**
 * Get job statistics
 */
export function getJobStats() {
  const jobs = listJobs();
  const stats = {
    total: jobs.length,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0
  };

  for (const job of jobs) {
    if (stats[job.status] !== undefined) {
      stats[job.status]++;
    }
  }

  return stats;
}
