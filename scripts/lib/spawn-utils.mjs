#!/usr/bin/env node
/**
 * OMO - Spawn Utilities
 * Safe child process spawning with timeout, signal cleanup, and leak prevention
 */

import { spawn } from 'child_process';

// Track active children for cleanup on SIGINT/SIGTERM
const activeChildren = new Set();

let handlersInstalled = false;

/**
 * Install signal handlers once to kill active children on exit
 */
function installSignalHandlers() {
  if (handlersInstalled) return;
  handlersInstalled = true;

  const killAll = (signal) => {
    for (const child of activeChildren) {
      try {
        child.kill(signal);
      } catch {
        // Ignore if already dead
      }
    }
    activeChildren.clear();
  };

  process.on('SIGINT', () => {
    killAll('SIGTERM');
    process.exit(130);
  });

  process.on('SIGTERM', () => {
    killAll('SIGTERM');
    process.exit(143);
  });
}

/**
 * Spawn a child process with automatic cleanup
 * @param {string} command
 * @param {string[]} args
 * @param {Object} options
 * @param {number} options.timeoutMs - Max runtime before kill (default: 300000 = 5 min)
 * @param {Object} options.spawnOptions - Passed to spawn()
 * @param {Function} options.onData - Optional callback for streaming stdout data
 * @returns {Promise<{output: string, errorOutput: string, code: number, duration: number}>}
 */
export function spawnWithCleanup(command, args, options = {}) {
  installSignalHandlers();

  const { timeoutMs = 300000, spawnOptions = {}, onData } = options;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const child = spawn(command, args, spawnOptions);

    activeChildren.add(child);

    let output = '';
    let errorOutput = '';
    let resolved = false;

    function cleanup() {
      activeChildren.delete(child);
      if (timeoutId) clearTimeout(timeoutId);
      child.stdout?.removeAllListeners();
      child.stderr?.removeAllListeners();
      child.removeAllListeners();
    }

    function finish(err, code) {
      if (resolved) return;
      resolved = true;
      cleanup();
      if (err) {
        reject(err);
      } else {
        resolve({
          output,
          errorOutput,
          code,
          duration: Date.now() - startTime
        });
      }
    }

    const timeoutId = timeoutMs > 0
      ? setTimeout(() => {
          try { child.kill('SIGTERM'); } catch {}
          // Give it 5s to die gracefully, then SIGKILL
          setTimeout(() => {
            try { child.kill('SIGKILL'); } catch {}
          }, 5000);
          finish(new Error(`Process timed out after ${timeoutMs}ms`));
        }, timeoutMs)
      : null;

    child.stdout?.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      if (onData) onData(chunk);
    });

    child.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      finish(null, code);
    });

    child.on('error', (err) => {
      finish(new Error(`Failed to spawn ${command}: ${err.message}`));
    });
  });
}

/**
 * Get number of active child processes
 */
export function getActiveChildCount() {
  // Remove dead children from set
  for (const child of activeChildren) {
    if (child.exitCode !== null || child.signalCode !== null) {
      activeChildren.delete(child);
    }
  }
  return activeChildren.size;
}
