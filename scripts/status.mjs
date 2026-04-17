#!/usr/bin/env node
/**
 * Ollama CC - Status Command
 * CLI for checking job status
 * Usage: ollama-cc status [job-id]
 */

import { listJobs, getJob, getJobStats, cleanupOldJobs } from './lib/job-store.mjs';
import { isDaemonRunning, getDaemonPid, startDaemon, stopDaemon } from './lib/daemon.mjs';
import { COLORS } from './lib/config.mjs';

const { reset: RESET, green: GREEN, yellow: YELLOW, blue: BLUE, cyan: CYAN, red: RED } = COLORS;

/**
 * Format timestamp for display
 */
function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString();
}

/**
 * Format duration from timestamps
 */
function formatDuration(start, end) {
  const diff = new Date(end) - new Date(start);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Get status icon
 */
function getStatusIcon(status) {
  switch (status) {
    case 'completed': return `${GREEN}✓${RESET}`;
    case 'running': return `${CYAN}⟳${RESET}`;
    case 'pending': return `${YELLOW}○${RESET}`;
    case 'failed': return `${RED}✗${RESET}`;
    default: return `${YELLOW}?${RESET}`;
  }
}

/**
 * Show daemon status
 */
function showDaemonStatus() {
  const running = isDaemonRunning();
  const pid = getDaemonPid();

  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}  Daemon Status${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

  if (running) {
    console.log(`Status: ${GREEN}Running${RESET}`);
    console.log(`PID: ${pid}`);
  } else {
    console.log(`Status: ${YELLOW}Not Running${RESET}`);
  }
  console.log();
}

/**
 * Show job statistics
 */
function showStats() {
  const stats = getJobStats();

  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}  Job Statistics${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

  console.log(`Total Jobs:   ${stats.total}`);
  console.log(`  ${YELLOW}Pending:  ${stats.pending}${RESET}`);
  console.log(`  ${CYAN}Running:  ${stats.running}${RESET}`);
  console.log(`  ${GREEN}Completed: ${stats.completed}${RESET}`);
  console.log(`  ${RED}Failed:   ${stats.failed}${RESET}`);
  console.log();
}

/**
 * List all jobs
 */
function listAllJobs(statusFilter = null) {
  const jobs = listJobs(statusFilter);

  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}  Jobs${statusFilter ? ` (${statusFilter})` : ''}${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

  if (jobs.length === 0) {
    console.log('No jobs found.\n');
    return;
  }

  // Table header
  console.log(`${CYAN}ID${RESET}                              ${CYAN}Type${RESET}     ${CYAN}Status${RESET}      ${CYAN}Created${RESET}`);
  console.log('─'.repeat(80));

  for (const job of jobs.slice(0, 20)) { // Show last 20
    const id = job.id.substring(0, 20).padEnd(20);
    const type = job.type.padEnd(8);
    const status = job.status.padEnd(11);
    const created = formatTime(job.createdAt).substring(0, 20);
    const icon = getStatusIcon(job.status);
    console.log(`${icon} ${id} ${type} ${status} ${created}`);
  }

  if (jobs.length > 20) {
    console.log(`\n... and ${jobs.length - 20} more jobs`);
  }
  console.log();
}

/**
 * Show detailed job info
 */
function showJobDetail(jobId) {
  const job = getJob(jobId);

  if (!job) {
    console.error(`${RED}Error: Job not found: ${jobId}${RESET}`);
    process.exit(1);
  }

  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}  Job Details${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

  console.log(`${CYAN}ID:${RESET}        ${job.id}`);
  console.log(`${CYAN}Type:${RESET}      ${job.type}`);
  console.log(`${CYAN}Status:${RESET}    ${getStatusIcon(job.status)} ${job.status}`);
  console.log(`${CYAN}Created:${RESET}   ${formatTime(job.createdAt)}`);
  console.log(`${CYAN}Updated:${RESET}   ${formatTime(job.updatedAt)}`);

  if (job.prompt) {
    console.log(`${CYAN}Prompt:${RESET}    ${job.prompt.substring(0, 100)}${job.prompt.length > 100 ? '...' : ''}`);
  }

  if (job.options) {
    console.log(`${CYAN}Options:${RESET}   ${JSON.stringify(job.options)}`);
  }

  if (job.status === 'completed' && job.results) {
    console.log(`\n${GREEN}Results:${RESET}`);
    if (job.results.verdict) {
      console.log(`  Verdict: ${job.results.verdict}`);
    }
    if (job.results.confidence !== undefined) {
      console.log(`  Confidence: ${(job.results.confidence * 100).toFixed(1)}%`);
    }
    if (job.results.consensusLevel) {
      console.log(`  Consensus: ${job.results.consensusLevel}`);
    }
  }

  if (job.status === 'failed' && job.error) {
    console.log(`\n${RED}Error:${RESET} ${job.error}`);
  }

  console.log();
}

/**
 * Show help
 */
function showHelp() {
  console.log(`${BLUE}Ollama CC Status${RESET} - Job status and daemon management\n`);
  console.log('Usage:');
  console.log('  ollama-cc status              List all jobs');
  console.log('  ollama-cc status <job-id>     Show job details');
  console.log('  ollama-cc status --daemon     Show daemon status');
  console.log('  ollama-cc status --stats      Show job statistics');
  console.log('  ollama-cc status --running    List running jobs only');
  console.log('  ollama-cc status --completed  List completed jobs only');
  console.log('  ollama-cc status --failed     List failed jobs only');
  console.log('  ollama-cc status --pending    List pending jobs only');
  console.log('  ollama-cc status --cleanup    Clean up old jobs (7 days)');
  console.log('  ollama-cc status --start      Start daemon');
  console.log('  ollama-cc status --stop       Stop daemon');
  console.log('  ollama-cc status --help       Show this help');
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  // Daemon control
  if (args.includes('--start')) {
    const result = startDaemon();
    console.log(result.message);
    return;
  }

  if (args.includes('--stop')) {
    const result = stopDaemon();
    console.log(result.message);
    return;
  }

  if (args.includes('--daemon')) {
    showDaemonStatus();
    return;
  }

  // Stats
  if (args.includes('--stats')) {
    showStats();
    return;
  }

  // Cleanup
  if (args.includes('--cleanup')) {
    const removed = cleanupOldJobs(7);
    console.log(`${GREEN}Cleaned up ${removed} old jobs${RESET}`);
    return;
  }

  // Status filters
  if (args.includes('--running')) {
    listAllJobs('running');
    return;
  }
  if (args.includes('--completed')) {
    listAllJobs('completed');
    return;
  }
  if (args.includes('--failed')) {
    listAllJobs('failed');
    return;
  }
  if (args.includes('--pending')) {
    listAllJobs('pending');
    return;
  }

  // Job detail
  const jobId = args[0];
  if (jobId && !jobId.startsWith('--')) {
    showJobDetail(jobId);
    return;
  }

  // Default: list all jobs and show daemon status
  showDaemonStatus();
  showStats();
  listAllJobs();
}

main();
