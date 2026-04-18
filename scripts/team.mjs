#!/usr/bin/env node
/**
 * Ollama CC - Team Mode (Phase 3 v0.2.0)
 * Parallel workers with ensemble voting, task distribution, JSON output, and daemon support
 */

import { spawn } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { COLORS, OLLAMA_ENV } from './lib/config.mjs';
import { resolveModelName, withRetry } from './lib/utils.mjs';
import { createJob, markJobCompleted, markJobFailed } from './lib/job-store.mjs';
import { submitToDaemon } from './lib/daemon.mjs';

const { reset: RESET, green: GREEN, yellow: YELLOW, blue: BLUE, cyan: CYAN, magenta: MAGENTA } = COLORS;

const MODEL_COLORS = {
  'glm-5.1': CYAN,
  'kimi': GREEN,
  'gemma4': MAGENTA
};

/**
 * Parse team specification (e.g., "3:kimi" or "glm-5.1:2")
 */
function parseTeamSpec(spec) {
  if (!spec) return null;

  const match = spec.match(/(\d+):(\w[\w.-]+)|(\w[\w.-]+):(\d+)/);
  if (!match) return null;

  const count = parseInt(match[1] || match[4], 10);
  const model = match[2] || match[3];

  return {
    count,
    modelKey: model,
    modelName: resolveModelName(model)
  };
}

/**
 * Generate subtasks from template
 */
function generateSubtasks(template, count) {
  const subtasks = [];

  for (let i = 0; i < count; i++) {
    const task = template
      .replace(/\{i\}/g, i + 1)
      .replace(/\{0\}/g, i)
      .replace(/\{n\}/g, count);
    subtasks.push({
      id: i + 1,
      task,
      status: 'pending'
    });
  }

  return subtasks;
}

/**
 * Run a single worker
 */
function runWorker(workerId, modelName, prompt, color) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    process.stdout.write(`${color}[${workerId}]${RESET} `);

    const child = spawn('ollama', ['run', modelName, prompt, '--nowordwrap'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...OLLAMA_ENV
      }
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      if (code === 0) {
        process.stdout.write(`${color}✓${RESET} (${duration}ms)\n`);
        resolve({
          workerId,
          output: output.trim(),
          duration,
          status: 'completed'
        });
      } else {
        process.stdout.write(`${color}✗${RESET} ERROR\n`);
        reject(new Error(`Worker ${workerId} failed: ${errorOutput}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Worker ${workerId} spawn error: ${err.message}`));
    });
  });
}

/**
 * Ensemble voting - find majority consensus
 */
function ensembleVote(results) {
  const keyPoints = results.map(r => {
    const lines = r.output.split('\n')
      .filter(l => l.trim() && l.length > 10)
      .slice(0, 3);
    return lines;
  });

  const allPoints = keyPoints.flat();
  const wordFreq = {};

  allPoints.forEach(point => {
    const words = point.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
  });

  const themes = Object.entries(wordFreq)
    .filter(([, freq]) => freq >= results.length * 0.6)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);

  return {
    themes,
    agreement: themes.length > 0 ? 'high' : 'low',
    workerCount: results.length
  };
}

/**
 * Save team results to artifact
 */
function saveArtifact(spec, results, ensemble, options) {
  const artifactDir = join(homedir(), '.omc', 'artifacts', 'ollama-cc', 'team');
  mkdirSync(artifactDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `team-${spec.modelKey}-${timestamp}.md`;
  const filepath = join(artifactDir, filename);

  const content = `# Team Mode Analysis

**Spec:** ${spec.count}x ${spec.modelName}
**Task Pattern:** ${options.taskTemplate}
**Mode:** ${options.ensemble ? 'Ensemble Voting' : 'Distributed Tasks'}
**Timestamp:** ${new Date().toISOString()}

## Summary

- **Workers:** ${results.length}
- **Total Time:** ${results.reduce((sum, r) => sum + r.duration, 0)}ms
- **Average Time:** ${Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length)}ms

${options.ensemble ? `## Ensemble Voting

**Agreement Level:** ${ensemble.agreement}
**Common Themes:** ${ensemble.themes.join(', ') || 'None significant'}
` : ''}

## Individual Results

${results.map(r => `### Worker ${r.workerId} (${r.duration}ms)

${r.output.slice(0, 500)}${r.output.length > 500 ? `\n... (${r.output.length - 500} more chars)` : ''}
`).join('\n---\n\n')}
`;

  writeFileSync(filepath, content);
  return filepath;
}

/**
 * Generate JSON output for machine-readable results
 */
function generateJsonOutput(spec, results, ensemble, taskTemplate, options) {
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  const avgTime = results.length > 0 ? Math.round(totalTime / results.length) : 0;

  return {
    spec: {
      count: spec.count,
      modelKey: spec.modelKey,
      modelName: spec.modelName
    },
    taskTemplate,
    mode: options.ensemble ? 'ensemble' : 'distribute',
    summary: {
      workers: results.length,
      totalTime,
      averageTime: avgTime
    },
    ensemble: options.ensemble && ensemble ? {
      agreement: ensemble.agreement,
      themes: ensemble.themes,
      workerCount: ensemble.workerCount
    } : null,
    results: results.map(r => ({
      workerId: r.workerId,
      duration: r.duration,
      status: r.status,
      output: r.output
    })),
    timestamp: new Date().toISOString()
  };
}

/**
 * Main team mode function
 */
export async function teamMode(countOrSpec, model, task, options = {}) {
  let spec;
  let taskTemplate;

  if (typeof countOrSpec === 'string' && countOrSpec.includes(':')) {
    spec = parseTeamSpec(countOrSpec);
    taskTemplate = task;
  } else if (countOrSpec && model) {
    spec = {
      count: parseInt(countOrSpec, 10),
      modelKey: model,
      modelName: model.includes(':') ? model : `${model}:cloud`
    };
    taskTemplate = task;
  } else {
    console.error('Error: Invalid team specification');
    console.error('Usage: team N:model "task-{i}" [--ensemble] [--format json] [--detach]');
    console.error('Examples:');
    console.error('  team 3:kimi "analyze file-{i}.ts"');
    console.error('  team 5:gemma "refactor module" --ensemble');
    process.exit(1);
  }

  if (!spec) {
    console.error('Error: Could not parse team spec. Format: N:model (e.g., 3:kimi)');
    process.exit(1);
  }

  const format = options.format || 'text';

  // Handle detached mode
  if (options.detach) {
    const job = createJob('team', {
      options: {
        spec: countOrSpec,
        model,
        task,
        ensemble: options.ensemble || false,
        format
      }
    });
    await submitToDaemon(job);
    if (format !== 'json') {
      console.log(`${YELLOW}Job ${job.id} submitted to daemon${RESET}`);
      console.log(`Check status: ollama-cc status ${job.id}`);
    } else {
      console.log(JSON.stringify({ jobId: job.id, status: 'queued', detached: true }));
    }
    return { jobId: job.id, detached: true };
  }

  const subtasks = options.ensemble
    ? Array(spec.count).fill(null).map((_, i) => ({ id: i + 1, task: taskTemplate, status: 'pending' }))
    : generateSubtasks(taskTemplate, spec.count);

  if (format !== 'json') {
    console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
    console.log(`${BLUE}  Team Mode - Phase 3${RESET}`);
    console.log(`${BLUE}  ${spec.count}x ${spec.modelName}${RESET}`);
    console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

    if (options.ensemble) {
      console.log(`${YELLOW}Ensemble Mode:${RESET} Running ${spec.count} workers with same task`);
      console.log(`${YELLOW}Task:${RESET} ${taskTemplate}\n`);
    } else {
      console.log(`${YELLOW}Distribute Mode:${RESET} Running ${spec.count} subtasks`);
      subtasks.slice(0, 5).forEach(s => console.log(`  ${CYAN}[${s.id}]${RESET} ${s.task.slice(0, 60)}...`));
      if (subtasks.length > 5) {
        console.log(`  ... and ${subtasks.length - 5} more`);
      }
      console.log();
    }

    console.log(`${YELLOW}Spawning workers...${RESET}\n`);
  }

  const promises = subtasks.map((s) => {
    const color = MODEL_COLORS[spec.modelKey] || CYAN;
    return withRetry(
      () => runWorker(s.id, spec.modelName, s.task, color),
      {
        maxRetries: 2,
        baseDelay: 1000,
        onRetry: (err, attempt) => {
          if (format !== 'json') {
            console.log(`${YELLOW}[${s.id}] Retry ${attempt}/2${RESET}`);
          }
        }
      }
    );
  });

  const startTime = Date.now();

  // Use Promise.allSettled to handle partial failures
  const settledResults = await Promise.allSettled(promises);

  const totalTime = Date.now() - startTime;

  // Filter successful results and log failures
  const results = [];
  const failures = [];

  settledResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      failures.push({ workerId: index + 1, reason: result.reason.message });
      if (format !== 'json') {
        console.error(`${MAGENTA}Worker ${index + 1} failed:${RESET} ${result.reason.message}`);
      }
    }
  });

  if (failures.length === settledResults.length) {
    console.error(`\n${MAGENTA}Error:${RESET} All workers failed`);
    process.exit(1);
  }

  let ensemble = null;
  if (options.ensemble && results.length > 0) {
    ensemble = ensembleVote(results);
  }

  // Output JSON if requested
  if (format === 'json') {
    const jsonOutput = generateJsonOutput(spec, results, ensemble, taskTemplate, options);
    console.log(JSON.stringify(jsonOutput, null, 2));
    return jsonOutput;
  }

  console.log(`\n${YELLOW}Completed: ${results.length}/${settledResults.length} workers in ${totalTime}ms${RESET}\n`);

  if (options.ensemble && ensemble) {
    console.log(`${BLUE}Analyzing ensemble consensus...${RESET}\n`);
    console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
    console.log(`${BLUE}  ENSEMBLE RESULTS${RESET}`);
    console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

    console.log(`${YELLOW}Agreement Level:${RESET} ${ensemble.agreement.toUpperCase()}`);
    if (ensemble.themes.length > 0) {
      console.log(`${YELLOW}Common Themes:${RESET} ${ensemble.themes.join(', ')}`);
    } else {
      console.log(`${YELLOW}Note:${RESET} Low agreement - workers have divergent opinions`);
    }
    console.log();

    results.forEach(r => {
      const summary = r.output.split('\n')[0].slice(0, 80);
      console.log(`${CYAN}[${r.workerId}]${RESET} ${summary}...`);
    });
    console.log();
  }

  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}  SUMMARY${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

  console.log(`Workers: ${results.length}/${settledResults.length} succeeded`);
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Average: ${results.length > 0 ? Math.round(results.reduce((s, r) => s + r.duration, 0) / results.length) : 0}ms`);
  console.log(`Parallel Speedup: ~${(results.reduce((s, r) => s + r.duration, 0) / totalTime).toFixed(1)}x`);
  console.log();

  const artifactPath = saveArtifact(spec, results, ensemble, { taskTemplate, ensemble: options.ensemble });
  console.log(`${YELLOW}💾 Saved to: ${artifactPath}${RESET}\n`);

  return { results, ensemble };
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  const ensembleFlag = args.includes('--ensemble');
  const detachFlag = args.includes('--detach');

  const formatIndex = args.indexOf('--format');
  const format = formatIndex >= 0 ? args[formatIndex + 1] : 'text';

  const filteredArgs = args.filter((a, i) => {
    if (a === '--ensemble' || a === '--detach') return false;
    if (i === formatIndex || i === formatIndex + 1) return false;
    return true;
  });

  const teamSpec = filteredArgs[0];
  const task = filteredArgs.slice(1).join(' ');

  teamMode(teamSpec, null, task, { ensemble: ensembleFlag, format, detach: detachFlag });
}
