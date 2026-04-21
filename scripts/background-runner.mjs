#!/usr/bin/env node
/**
 * OMO - Background Runner Entry Point
 * One-shot process: receives jobId, executes it, exits.
 * Usage: node background-runner.mjs <job-id>
 */

import { executeJob } from './lib/background.mjs';

const jobId = process.argv[2];

if (!jobId) {
  console.error('Usage: node background-runner.mjs <job-id>');
  process.exit(1);
}

executeJob(jobId)
  .then((result) => {
    if (!result.success) {
      console.error(`Job ${jobId} failed:`, result.error);
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error(`Job ${jobId} crashed:`, err.message);
    process.exit(1);
  });
