#!/usr/bin/env node
/**
 * Ollama CC - Debate Mode (Phase 2)
 * Multi-model consensus with quality tiers
 *
 * Flow:
 * 1. Run 3 models in parallel with same prompt
 * 2. Collect outputs
 * 3. Compare for agreements/disagreements
 * 4. Synthesize verdict based on quality tier
 */

import { spawn } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Model specifications with expertise areas
const MODELS = {
  'glm-5.1': {
    name: 'glm-5.1:cloud',
    expertise: 'Coding, Architecture, Agentic Tasks',
    color: '\x1b[36m' // Cyan
  },
  'kimi': {
    name: 'kimi-k2.5:cloud',
    expertise: 'Reasoning, Multimodal, Debugging',
    color: '\x1b[32m' // Green
  },
  'gemma4': {
    name: 'gemma4:31b-cloud',
    expertise: 'Refactoring, OCR, Document Parsing',
    color: '\x1b[35m' // Magenta
  }
};

const RESET = '\x1b[0m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

/**
 * Run a single model and capture output
 */
function runModel(modelKey, modelConfig, prompt) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const child = spawn('ollama', ['run', modelConfig.name, prompt, '--nowordwrap'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        OLLAMA_KEEP_ALIVE: '1h',
        OLLAMA_NUM_PARALLEL: '4'
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
        resolve({
          model: modelKey,
          modelName: modelConfig.name,
          output: output.trim(),
          duration,
          expertise: modelConfig.expertise
        });
      } else {
        reject(new Error(`${modelConfig.name} exited with code ${code}: ${errorOutput}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn ${modelConfig.name}: ${err.message}`));
    });
  });
}

/**
 * Calculate simple agreement score between two outputs
 * (Basic implementation - checks for shared key phrases)
 */
function calculateAgreement(output1, output2) {
  const words1 = new Set(output1.toLowerCase().split(/\s+/).filter(w => w.length > 4));
  const words2 = new Set(output2.toLowerCase().split(/\s+/).filter(w => w.length > 4));

  const intersection = [...words1].filter(w => words2.has(w));
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? (intersection.length / union.size) * 100 : 0;
}

/**
 * Analyze agreements and disagreements between all models
 */
function analyzeConsensus(results) {
  const pairs = [
    ['glm-5.1', 'kimi'],
    ['glm-5.1', 'gemma4'],
    ['kimi', 'gemma4']
  ];

  const agreements = {};
  let totalAgreement = 0;

  for (const [m1, m2] of pairs) {
    const r1 = results.find(r => r.model === m1);
    const r2 = results.find(r => r.model === m2);
    if (r1 && r2) {
      const score = calculateAgreement(r1.output, r2.output);
      agreements[`${m1}-${m2}`] = score;
      totalAgreement += score;
    }
  }

  const averageAgreement = totalAgreement / pairs.length;

  return {
    agreements,
    averageAgreement,
    consensusLevel: averageAgreement >= 70 ? 'high' : averageAgreement >= 40 ? 'medium' : 'low'
  };
}

/**
 * Generate synthesis based on quality tier
 */
function generateSynthesis(results, consensus, tier) {
  const { averageAgreement, consensusLevel } = consensus;

  let synthesis = '';

  switch (tier) {
    case 'fast':
      if (consensusLevel === 'high') {
        synthesis = `✓ Strong consensus (${averageAgreement.toFixed(1)}%) - All models agree on the approach.`;
      } else {
        synthesis = `⚠ Mixed opinions (${averageAgreement.toFixed(1)}%) - Review individual outputs.`;
      }
      break;

    case 'standard':
      synthesis = `Consensus Analysis (${averageAgreement.toFixed(1)}%):\n`;
      if (consensusLevel === 'high') {
        synthesis += '  ✓ High agreement across all models\n';
        synthesis += '  ✓ Recommended approach is well-supported\n';
      } else if (consensusLevel === 'medium') {
        synthesis += '  ⚠ Partial agreement - some trade-offs identified\n';
        synthesis += '  → Review disagreements for nuanced considerations\n';
      } else {
        synthesis += '  ⚡ Low agreement - significant differences in approach\n';
        synthesis += '  → Careful evaluation needed; consider context-specific factors\n';
      }
      break;

    case 'deep':
    default:
      synthesis = `Deep Analysis (${averageAgreement.toFixed(1)}% agreement):\n\n`;

      // Extract key points from each model
      synthesis += '## Key Perspectives\n\n';
      for (const r of results) {
        const keyPoints = r.output
          .split('\n')
          .filter(line => line.trim() && line.length > 20)
          .slice(0, 2)
          .join('\n  - ');

        synthesis += `### ${MODELS[r.model].name}\n`;
        synthesis += `Focus: ${r.expertise}\n`;
        synthesis += `  - ${keyPoints}\n\n`;
      }

      synthesis += '## Agreement Matrix\n\n';
      for (const [pair, score] of Object.entries(consensus.agreements)) {
        const [m1, m2] = pair.split('-');
        const bar = '█'.repeat(Math.floor(score / 10)) + '░'.repeat(10 - Math.floor(score / 10));
        synthesis += `  ${m1} ↔ ${m2}: ${bar} ${score.toFixed(1)}%\n`;
      }

      synthesis += '\n## Verdict\n\n';
      if (consensusLevel === 'high') {
        synthesis += '**Recommendation:** Proceed with confidence.\n';
        synthesis += 'All models converge on similar conclusions.\n';
      } else if (consensusLevel === 'medium') {
        synthesis += '**Recommendation:** Valid approach with noted trade-offs.\n';
        synthesis += 'Consider the disagreements as risk factors.\n';
      } else {
        synthesis += '**Recommendation:** High uncertainty.\n';
        synthesis += 'Models disagree significantly - gather more data or consult domain expert.\n';
      }
      break;
  }

  return synthesis;
}

/**
 * Save debate results to artifact file
 */
function saveArtifact(prompt, results, consensus, synthesis, tier) {
  const artifactDir = join(homedir(), '.omc', 'artifacts', 'ollama-cc');
  mkdirSync(artifactDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `debate-${tier}-${timestamp}.md`;
  const filepath = join(artifactDir, filename);

  const content = `# Debate Mode Analysis

**Prompt:** ${prompt}
**Tier:** ${tier}
**Timestamp:** ${new Date().toISOString()}
**Consensus:** ${consensus.averageAgreement.toFixed(1)}%

## Models

${results.map(r => `- **${r.modelName}** (${r.duration}ms) - ${r.expertise}`).join('\n')}

## Synthesis

${synthesis}

## Full Outputs

${results.map(r => `### ${r.modelName}\n\n${r.output}`).join('\n\n---\n\n')}
`;

  writeFileSync(filepath, content);
  return filepath;
}

/**
 * Main debate mode function
 */
export async function debateMode(prompt, options = {}) {
  if (!prompt) {
    console.error('Error: No prompt provided. Usage: debate "<prompt>" [--tier fast|standard|deep]');
    process.exit(1);
  }

  const tier = options.tier || 'standard';

  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}  Debate Mode - Phase 2${RESET}`);
  console.log(`${BLUE}  Quality Tier: ${tier.toUpperCase()}${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

  console.log(`${YELLOW}Running 3 models in parallel...${RESET}\n`);

  // Run all models in parallel
  const startTime = Date.now();
  const promises = Object.entries(MODELS).map(([key, config]) => {
    process.stdout.write(`${config.color}  ▶ ${config.name}${RESET} `);
    return runModel(key, config, prompt).then(result => {
      process.stdout.write(`${config.color}✓${RESET} (${result.duration}ms)\n`);
      return result;
    }).catch(err => {
      process.stdout.write(`${config.color}✗${RESET} ERROR\n`);
      throw err;
    });
  });

  let results;
  try {
    results = await Promise.all(promises);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }

  const totalTime = Date.now() - startTime;
  console.log(`\n${YELLOW}All models completed in ${totalTime}ms${RESET}\n`);

  // Analyze consensus
  console.log(`${BLUE}Analyzing consensus...${RESET}\n`);
  const consensus = analyzeConsensus(results);

  // Generate synthesis
  const synthesis = generateSynthesis(results, consensus, tier);

  // Display results
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}  RESULTS${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

  console.log(synthesis);
  console.log();

  // Save artifact
  const artifactPath = saveArtifact(prompt, results, consensus, synthesis, tier);
  console.log(`${YELLOW}💾 Saved to: ${artifactPath}${RESET}\n`);

  // Individual outputs (for STANDARD and DEEP tiers)
  if (tier !== 'fast') {
    console.log(`${BLUE}Individual Model Outputs:${RESET}\n`);
    for (const r of results) {
      console.log(`${r.expertise}`);
      console.log(`Model: ${MODELS[r.model].name}`);
      console.log(`---`);
      console.log(r.output.slice(0, 500));
      if (r.output.length > 500) {
        console.log(`... (${r.output.length - 500} more chars)`);
      }
      console.log(`\n`);
    }
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const tierIndex = args.indexOf('--tier');
  const tier = tierIndex >= 0 ? args[tierIndex + 1] : 'standard';

  // Remove --tier and its value from args
  const filteredArgs = args.filter((_, i) => i !== tierIndex && i !== tierIndex + 1);
  const prompt = filteredArgs.join(' ');

  debateMode(prompt, { tier }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}