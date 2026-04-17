#!/usr/bin/env node
/**
 * Ollama CC - Background Execution Daemon
 * Manages background job execution
 */

import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createJob, updateJob, markJobRunning, markJobCompleted, markJobFailed, getJob } from './job-store.mjs';

const DAEMON_PID_FILE = join(homedir(), '.ollama-cc', 'daemon.pid');
const DAEMON_LOG_FILE = join(homedir(), '.ollama-cc', 'daemon.log');

/**
 * Ensure ollama-cc directory exists
 */
function ensureDir() {
  const dir = join(homedir(), '.ollama-cc');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Check if daemon is running
 */
export function isDaemonRunning() {
  if (!existsSync(DAEMON_PID_FILE)) {
    return false;
  }

  try {
    const pid = parseInt(readFileSync(DAEMON_PID_FILE, 'utf-8'), 10);
    // Check if process exists
    process.kill(pid, 0);
    return true;
  } catch {
    // Process doesn't exist, clean up stale pid file
    try {
      unlinkSync(DAEMON_PID_FILE);
    } catch {}
    return false;
  }
}

/**
 * Get daemon PID
 */
export function getDaemonPid() {
  if (!existsSync(DAEMON_PID_FILE)) {
    return null;
  }
  try {
    return parseInt(readFileSync(DAEMON_PID_FILE, 'utf-8'), 10);
  } catch {
    return null;
  }
}

/**
 * Start the background daemon
 */
export function startDaemon() {
  ensureDir();

  if (isDaemonRunning()) {
    return { success: false, message: 'Daemon is already running', pid: getDaemonPid() };
  }

  // Spawn a detached daemon process
  const scriptPath = new URL('../daemon-worker.mjs', import.meta.url).pathname;

  const child = spawn(process.execPath, [scriptPath], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      OLLAMA_CC_DAEMON: '1'
    }
  });

  child.unref();

  // Write PID file
  writeFileSync(DAEMON_PID_FILE, child.pid.toString());

  return { success: true, message: 'Daemon started', pid: child.pid };
}

/**
 * Stop the daemon
 */
export async function stopDaemon() {
  if (!isDaemonRunning()) {
    return { success: false, message: 'Daemon is not running' };
  }

  const pid = getDaemonPid();
  if (!pid) {
    return { success: false, message: 'Could not read daemon PID' };
  }

  try {
    process.kill(pid, 'SIGTERM');

    // Wait up to 2 seconds for graceful shutdown
    let attempts = 0;
    while (isDaemonRunning() && attempts < 20) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    if (!isDaemonRunning()) {
      try {
        unlinkSync(DAEMON_PID_FILE);
      } catch {}
      return { success: true, message: 'Daemon stopped' };
    } else {
      // Force kill
      process.kill(pid, 'SIGKILL');
      await new Promise(r => setTimeout(r, 100));
      try {
        unlinkSync(DAEMON_PID_FILE);
      } catch {}
      return { success: true, message: 'Daemon force stopped' };
    }
  } catch (err) {
    return { success: false, message: `Failed to stop daemon: ${err.message}` };
  }
}

/**
 * Submit a job to the daemon
 */
export async function submitToDaemon(job) {
  if (!isDaemonRunning()) {
    // Auto-start daemon
    const result = startDaemon();
    if (!result.success) {
      throw new Error('Failed to start daemon');
    }
    // Wait a moment for daemon to initialize
    await new Promise(r => setTimeout(r, 500));
  }

  // Update job to mark as queued for daemon
  updateJob(job.id, { status: 'queued', daemonQueuedAt: new Date().toISOString() });

  // Write job request to daemon's processing queue
  // The daemon watches for job files with 'queued' status
  return { success: true, jobId: job.id, message: 'Job submitted to daemon' };
}

/**
 * Execute a job immediately in background (for daemon use)
 */
export async function executeJob(job) {
  markJobRunning(job.id);

  try {
    let results;

    switch (job.type) {
      case 'debate':
        results = await executeDebateJob(job);
        break;
      case 'team':
        results = await executeTeamJob(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    markJobCompleted(job.id, results);
    return { success: true, jobId: job.id };
  } catch (error) {
    markJobFailed(job.id, error.message || 'Unknown error');
    return { success: false, jobId: job.id, error: error.message };
  }
}

/**
 * Execute debate job
 */
async function executeDebateJob(job) {
  // Import debate module dynamically
  const { debateMode } = await import('../debate.mjs');

  // Capture output by overriding console
  const outputs = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args) => outputs.push(args.join(' '));
  console.error = (...args) => outputs.push(args.join(' '));

  try {
    await debateMode(job.prompt, { tier: job.options?.tier || 'standard' });
    return {
      outputs,
      completedAt: new Date().toISOString()
    };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

/**
 * Execute team job
 */
async function executeTeamJob(job) {
  const { teamMode } = await import('../team.mjs');

  const outputs = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args) => outputs.push(args.join(' '));
  console.error = (...args) => outputs.push(args.join(' '));

  try {
    await teamMode(
      job.options?.spec,
      job.options?.model,
      job.options?.task,
      { ensemble: job.options?.ensemble || false }
    );
    return {
      outputs,
      completedAt: new Date().toISOString()
    };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}
