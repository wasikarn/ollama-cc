#!/usr/bin/env node
/**
 * OMO - Daemon Worker Process
 * Background process that executes queued jobs
 */

import { appendFileSync } from 'fs';
import { executeJob } from './lib/daemon.mjs';
import { listJobs, updateJob } from './lib/job-store.mjs';

const DAEMON_LOG_FILE = new URL('../../.ollama-cc/daemon.log', import.meta.url).pathname;

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  try {
    appendFileSync(DAEMON_LOG_FILE, line + '\n');
  } catch {}
}

async function daemonLoop() {
  log('Daemon started');

  while (true) {
    try {
      // Find queued jobs
      const allJobs = listJobs();
      const queuedJobs = allJobs.filter(j => j.status === 'queued');

      if (queuedJobs.length > 0) {
        log(`Found ${queuedJobs.length} queued jobs`);
      }

      for (const job of queuedJobs) {
        log(`Starting job ${job.id} (${job.type})`);
        updateJob(job.id, { status: 'running', daemonStartedAt: new Date().toISOString() });
        const result = await executeJob(job);
        if (result.success) {
          log(`Job ${job.id} completed successfully`);
        } else {
          log(`Job ${job.id} failed: ${result.error}`);
        }
      }
    } catch (err) {
      log(`Error in daemon loop: ${err.message}`);
    }

    // Sleep for 1 second before checking again
    await new Promise(r => setTimeout(r, 1000));
  }
}

// Handle signals for graceful shutdown
process.on('SIGTERM', () => {
  log('Daemon received SIGTERM, shutting down');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Daemon received SIGINT, shutting down');
  process.exit(0);
});

// Start the daemon
daemonLoop().catch(err => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
