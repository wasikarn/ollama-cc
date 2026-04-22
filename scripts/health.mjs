#!/usr/bin/env node
/**
 * OMO - Health Command
 * Check Ollama installation, model availability, and system status
 */

import { MODELS, COLORS } from './lib/config.mjs';
import { spawnWithCleanup } from './lib/spawn-utils.mjs';

const { reset: RESET, green: GREEN, yellow: YELLOW, red: RED, blue: BLUE, cyan: CYAN } = COLORS;

/**
 * Run a command and capture output
 */
async function runCommand(cmd, args = []) {
  try {
    const { output, errorOutput, code } = await spawnWithCleanup(
      cmd,
      args,
      {
        timeoutMs: 30000,
        spawnOptions: { stdio: ['ignore', 'pipe', 'pipe'] }
      }
    );
    return { code, stdout: output, stderr: errorOutput };
  } catch {
    return { code: -1, stdout: '', stderr: 'Command not found' };
  }
}

/**
 * Check Ollama version
 */
async function checkOllamaVersion() {
  const result = await runCommand('ollama', ['--version']);
  if (result.code !== 0) return null;

  const match = result.stdout.match(/ollama version (?:is )?(\S+)/);
  return match ? match[1] : result.stdout.trim();
}

/**
 * List available models from ollama
 */
async function listAvailableModels() {
  const result = await runCommand('ollama', ['list']);
  if (result.code !== 0) return [];

  const lines = result.stdout.split('\n').slice(1); // Skip header
  const models = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/\s{2,}/);
    if (parts.length >= 2) {
      models.push({
        name: parts[0],
        id: parts[1] || 'unknown',
        size: parts[2] || '-',
        modified: parts.slice(3).join(' ') || '-'
      });
    }
  }

  return models;
}

/**
 * Check which configured models are available
 */
function checkModelAvailability(availableModels) {
  const availableNames = new Set(availableModels.map(m => m.name));
  const results = [];

  for (const [key, config] of Object.entries(MODELS)) {
    const isAvailable = availableNames.has(config.name);
    results.push({
      key,
      name: config.name,
      available: isAvailable,
      context: config.context,
      expertise: config.expertise
    });
  }

  return results;
}

/**
 * Main health check function
 */
export async function healthCheck(options = {}) {
  const format = options.format || 'text';

  // Check Ollama installation
  const version = await checkOllamaVersion();
  const availableModels = version ? await listAvailableModels() : [];
  const modelStatus = checkModelAvailability(availableModels);

  const allAvailable = modelStatus.every(m => m.available);
  const availableCount = modelStatus.filter(m => m.available).length;

  if (format === 'json') {
    console.log(JSON.stringify({
      ollama: {
        installed: !!version,
        version: version || null
      },
      models: modelStatus,
      summary: {
        total: modelStatus.length,
        available: availableCount,
        ready: allAvailable
      },
      timestamp: new Date().toISOString()
    }, null, 2));
    return;
  }

  // Text output
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}  OMO Health Check${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

  // Ollama status
  if (version) {
    console.log(`${GREEN}✓ Ollama installed${RESET} — v${version}`);
  } else {
    console.log(`${RED}✗ Ollama not found${RESET}`);
    console.log(`  Install: https://ollama.com/download`);
    console.log(`  Or check your PATH if already installed.\n`);
    return;
  }

  // Available models count
  console.log(`\n${YELLOW}Available Models:${RESET} ${availableModels.length}`);
  if (availableModels.length > 0) {
    for (const m of availableModels.slice(0, 5)) {
      console.log(`  ${CYAN}•${RESET} ${m.name} (${m.size})`);
    }
    if (availableModels.length > 5) {
      console.log(`  ... and ${availableModels.length - 5} more`);
    }
  }

  // Configured model status
  console.log(`\n${YELLOW}Configured Models:${RESET}`);
  for (const m of modelStatus) {
    const icon = m.available ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    const color = m.available ? GREEN : RED;
    console.log(`  ${icon} ${color}${m.name}${RESET} — ${m.expertise}`);
    if (!m.available) {
      console.log(`    ${YELLOW}→ Pull with:${RESET} ollama pull ${m.name}`);
    }
  }

  // Summary
  console.log(`\n${BLUE}═══════════════════════════════════════════════════${RESET}`);
  if (allAvailable) {
    console.log(`${GREEN}  All systems ready ✓${RESET}`);
  } else {
    console.log(`${YELLOW}  ${availableCount}/${modelStatus.length} models ready${RESET}`);
    console.log(`${YELLOW}  Run 'ollama pull <model>' for missing models${RESET}`);
  }
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

  return {
    ollamaInstalled: !!version,
    version,
    models: modelStatus,
    ready: allAvailable
  };
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const format = args.includes('--format') ? 'json' : 'text';

  healthCheck({ format }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
