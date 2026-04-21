#!/usr/bin/env node
/**
 * OMO - Background Status Command
 * Shows ephemeral background job status.
 * No persistent daemon — processes spawn on demand and exit when done.
 */

import { listJobs, getJobStats } from './lib/job-store.mjs';
import { COLORS } from './lib/config.mjs';

const { reset: RESET, green: GREEN, yellow: YELLOW, blue: BLUE, cyan: CYAN, red: RED } = COLORS;

/**
 * Show background job status
 */
function showBackgroundStatus() {
  const stats = getJobStats();
  const running = listJobs('running');
  const pending = listJobs('pending');
  const queued = listJobs('queued');

  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}  Background Execution Status${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

  console.log(`Ephemeral mode: ${GREEN}Active${RESET} — processes spawn on demand, exit when done`);
  console.log();

  console.log(`Jobs:  ${stats.total} total`);
  console.log(`  ${YELLOW}Queued:    ${stats.pending + stats.queued}${RESET}`);
  console.log(`  ${CYAN}Running:   ${stats.running}${RESET}`);
  console.log(`  ${GREEN}Completed: ${stats.completed}${RESET}`);
  console.log(`  ${RED}Failed:    ${stats.failed}${RESET}`);
  console.log();

  if (running.length > 0) {
    console.log(`${CYAN}Running Jobs:${RESET}`);
    for (const job of running.slice(0, 5)) {
      const id = job.id.substring(0, 12);
      const type = job.type.padEnd(8);
      const prompt = (job.prompt || job.options?.task || '').slice(0, 40);
      console.log(`  ${CYAN}⟳${RESET} ${id} ${type} ${prompt}...`);
    }
    if (running.length > 5) {
      console.log(`  ... and ${running.length - 5} more`);
    }
    console.log();
  }

  if (pending.length > 0 || queued.length > 0) {
    console.log(`${YELLOW}Pending/Queued Jobs:${RESET}`);
    for (const job of [...pending, ...queued].slice(0, 5)) {
      const id = job.id.substring(0, 12);
      const type = job.type.padEnd(8);
      console.log(`  ${YELLOW}○${RESET} ${id} ${type}`);
    }
    console.log();
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(`${BLUE}OMO Background${RESET} — Ephemeral background execution status\n`);
  console.log('Usage:');
  console.log('  omo daemon --status    Show background job status');
  console.log('  omo daemon --help      Show this help');
  console.log();
  console.log('Background jobs are run via one-shot processes:');
  console.log('  omo panel --detach "task"  → spawns process → runs → exits');
  console.log('  omo swarm --detach "task"  → spawns process → runs → exits');
  console.log();
  console.log('No persistent daemon. No idle resource usage.');
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  showBackgroundStatus();
}

main();

export default main;
