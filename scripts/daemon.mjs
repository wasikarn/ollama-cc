#!/usr/bin/env node
/**
 * OMO - Daemon Control Command
 * CLI for controlling the background execution daemon
 */

import { isDaemonRunning, getDaemonPid, startDaemon, stopDaemon } from './lib/daemon.mjs';
import { COLORS } from './lib/config.mjs';

const { reset: RESET, green: GREEN, yellow: YELLOW, blue: BLUE, cyan: CYAN, red: RED } = COLORS;

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
 * Show help
 */
function showHelp() {
  console.log(`${BLUE}OMO Daemon${RESET} — Background execution daemon control\n`);
  console.log('Usage:');
  console.log('  omo daemon --start     Start the daemon');
  console.log('  omo daemon --stop      Stop the daemon');
  console.log('  omo daemon --status    Show daemon status');
  console.log('  omo daemon --help      Show this help');
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

  // Start daemon
  if (args.includes('--start')) {
    const result = startDaemon();
    console.log(result.success
      ? `${GREEN}${result.message}${RESET} (PID: ${result.pid})`
      : `${YELLOW}${result.message}${RESET}`);
    return;
  }

  // Stop daemon
  if (args.includes('--stop')) {
    stopDaemon().then(result => {
      console.log(result.success
        ? `${GREEN}${result.message}${RESET}`
        : `${YELLOW}${result.message}${RESET}`);
    });
    return;
  }

  // Default: show status
  showDaemonStatus();
}

main();

export default main;
