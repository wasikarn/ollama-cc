#!/usr/bin/env node
/**
 * OMO - Panel Command
 * Multi-model consensus with quality tiers, JSON output, and daemon support
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { MODELS, COLORS, OLLAMA_ENV } from './lib/config.mjs';
import { withRetry } from './lib/utils.mjs';
import { spawnBackground } from './lib/background.mjs';
import { getCachedResponse, setCachedResponse } from './lib/cache.mjs';
import { ConcurrencyLimiter } from './lib/concurrency-limiter.mjs';
import { spawnWithCleanup } from './lib/spawn-utils.mjs';

const { reset: RESET, yellow: YELLOW, blue: BLUE } = COLORS;

// Global concurrency limiter: max 3 concurrent Ollama calls (bulkhead)
const ollamaLimiter = new ConcurrencyLimiter(3);

/**
 * Run a single model and capture output
 */
function runModel(modelKey, modelConfig, prompt, useCache = true) {
  return ollamaLimiter.execute(() => runModelRaw(modelKey, modelConfig, prompt, useCache));
}

/**
 * Run a single model and capture output (unlimited — called through limiter)
 */
async function runModelRaw(modelKey, modelConfig, prompt, useCache = true) {
  // Check cache first
  if (useCache) {
    const cached = getCachedResponse(modelConfig.name, prompt);
    if (cached) {
      return {
        model: modelKey,
        modelName: modelConfig.name,
        output: cached.output,
        duration: 0,
        expertise: modelConfig.expertise,
        cached: true,
        cacheAge: cached.cacheAge
      };
    }
  }

  const { output, errorOutput, code, duration } = await spawnWithCleanup(
    'ollama',
    ['run', modelConfig.name, prompt, '--nowordwrap'],
    {
      timeoutMs: 300000,
      spawnOptions: {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...OLLAMA_ENV }
      }
    }
  );

  if (code === 0) {
    const result = {
      model: modelKey,
      modelName: modelConfig.name,
      output: output.trim(),
      duration,
      expertise: modelConfig.expertise
    };
    if (useCache) {
      setCachedResponse(modelConfig.name, prompt, result);
    }
    return result;
  }
  throw new Error(`${modelConfig.name} exited with code ${code}: ${errorOutput}`);
}

/**
 * Technical keywords with higher weight in agreement scoring
 */
const TECH_KEYWORDS = new Set([
  'microservices', 'monolith', 'architecture', 'database', 'api', 'graphql', 'rest',
  'async', 'sync', 'concurrency', 'parallel', 'thread', 'queue', 'cache', 'redis',
  'kubernetes', 'docker', 'terraform', 'aws', 'gcp', 'azure', 'cloud',
  'encryption', 'auth', 'oauth', 'jwt', 'rbac', 'security', 'vulnerability',
  'scaling', 'sharding', 'replication', 'load balancer', 'cdn', 'proxy',
  'transaction', 'acid', 'base', 'consistency', 'availability', 'partition',
  'event sourcing', 'cqrs', 'saga', 'outbox', 'messaging', 'kafka', 'rabbitmq',
  'observability', 'logging', 'metrics', 'tracing', 'monitoring', 'alerting',
  'testing', 'unit', 'integration', 'e2e', 'mock', 'stub', 'coverage',
  'refactor', 'migrate', 'upgrade', 'deprecate', 'legacy', 'modernize',
  'performance', 'optimization', 'bottleneck', 'latency', 'throughput',
  'typescript', 'javascript', 'python', 'go', 'rust', 'java', 'sql', 'nosql',
  'react', 'vue', 'angular', 'nextjs', 'node', 'express', 'fastapi',
  'solid', 'dry', 'kiss', 'yagni', 'clean', 'hexagonal', 'layered', 'ddd'
]);

/**
 * Calculate weighted agreement score between two outputs
 * Combines: word overlap, sentence overlap, keyword matching, structure similarity
 */
function calculateAgreement(output1, output2) {
  const norm1 = output1.toLowerCase();
  const norm2 = output2.toLowerCase();

  // 1. Word overlap (Jaccard) with length filter
  const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 3));
  const wordIntersection = [...words1].filter(w => words2.has(w));
  const wordUnion = new Set([...words1, ...words2]);
  const wordScore = wordUnion.size > 0 ? (wordIntersection.length / wordUnion.size) : 0;

  // 2. Technical keyword overlap (weighted 2x)
  const tech1 = [...words1].filter(w => TECH_KEYWORDS.has(w));
  const tech2 = [...words2].filter(w => TECH_KEYWORDS.has(w));
  const techIntersection = tech1.filter(w => tech2.includes(w));
  const techUnion = new Set([...tech1, ...tech2]);
  const techScore = techUnion.size > 0 ? (techIntersection.length / techUnion.size) : 0;

  // 3. Sentence overlap (first 3 sentences)
  const sentences1 = norm1.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  const sentences2 = norm2.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  const sentOverlap = sentences1.filter(s1 =>
    sentences2.some(s2 => {
      const common = s1.split(/\s+/).filter(w => s2.includes(w) && w.length > 4);
      return common.length >= 3;
    })
  ).length;
  const sentUnion = new Set([...sentences1, ...sentences2]).size;
  const sentScore = sentUnion > 0 ? sentOverlap / Math.min(sentences1.length, sentences2.length, 3) : 0;

  // 4. Structure similarity (list items, code blocks, headers)
  const structure1 = {
    bullets: (norm1.match(/^\s*[-*]\s+/gm) || []).length,
    numbers: (norm1.match(/^\s*\d+\.\s+/gm) || []).length,
    codeBlocks: (norm1.match(/```/g) || []).length / 2,
    headers: (norm1.match(/^#{1,3}\s+/gm) || []).length
  };
  const structure2 = {
    bullets: (norm2.match(/^\s*[-*]\s+/gm) || []).length,
    numbers: (norm2.match(/^\s*\d+\.\s+/gm) || []).length,
    codeBlocks: (norm2.match(/```/g) || []).length / 2,
    headers: (norm2.match(/^#{1,3}\s+/gm) || []).length
  };
  const structDiff = Math.abs(structure1.bullets - structure2.bullets) +
    Math.abs(structure1.numbers - structure2.numbers) +
    Math.abs(structure1.codeBlocks - structure2.codeBlocks) +
    Math.abs(structure1.headers - structure2.headers);
  const structMax = Math.max(
    structure1.bullets + structure1.numbers + structure1.codeBlocks + structure1.headers,
    structure2.bullets + structure2.numbers + structure2.codeBlocks + structure2.headers,
    1
  );
  const structScore = 1 - (structDiff / (structMax * 2));

  // Combined score: 40% word + 30% tech + 20% sentence + 10% structure
  const combined = (wordScore * 0.40 + techScore * 0.30 + sentScore * 0.20 + structScore * 0.10) * 100;
  return Math.min(combined, 100);
}

/**
 * Analyze agreements and disagreements between all models
 */
function analyzeConsensus(results) {
  const resultMap = new Map(results.map(r => [r.model, r]));

  const pairs = [];
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      pairs.push([results[i].model, results[j].model]);
    }
  }

  const agreements = {};
  let totalAgreement = 0;
  let pairCount = 0;

  for (const [m1, m2] of pairs) {
    const r1 = resultMap.get(m1);
    const r2 = resultMap.get(m2);
    if (r1 && r2) {
      const score = calculateAgreement(r1.output, r2.output);
      agreements[`${m1}-${m2}`] = score;
      totalAgreement += score;
      pairCount++;
    }
  }

  const averageAgreement = pairCount > 0 ? totalAgreement / pairCount : 0;

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
 * Run synthesizer model to produce unified response from all outputs
 */
async function runSynthesizer(results, prompt) {
  const synthesizerModel = 'qwen3.5:397b-cloud';

  const perspectives = results.map(r =>
    `=== ${r.modelName} (${r.expertise}) ===\n${r.output.slice(0, 2000)}`
  ).join('\n\n---\n\n');

  const synthesisPrompt = `You are a synthesis expert. Below are responses from multiple AI models to the same prompt. Produce a concise, unified synthesis that captures the consensus, highlights any disagreements, and provides a clear recommendation.

Original prompt: ${prompt}

${perspectives}

Please provide:
1. A brief summary of the consensus (if any)
2. Key points of agreement
3. Any disagreements or trade-offs
4. A clear, actionable recommendation

Keep your response under 400 words.`;

  const { output, errorOutput, code, duration } = await spawnWithCleanup(
    'ollama',
    ['run', synthesizerModel, synthesisPrompt, '--nowordwrap'],
    {
      timeoutMs: 300000,
      spawnOptions: {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...OLLAMA_ENV }
      }
    }
  );

  if (code === 0) {
    return {
      modelName: synthesizerModel,
      output: output.trim(),
      duration
    };
  }
  throw new Error(`Synthesizer exited with code ${code}: ${errorOutput}`);
}

/**
 * Save debate results to artifact file
 */
function saveArtifact(prompt, results, consensus, synthesis, tier, llmSynthesis = null) {
  const artifactDir = join(homedir(), '.omc', 'artifacts', 'ollama-cc');
  mkdirSync(artifactDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `debate-${tier}-${timestamp}.md`;
  const filepath = join(artifactDir, filename);

  let content = `# Debate Mode Analysis

**Prompt:** ${prompt}
**Tier:** ${tier}
**Timestamp:** ${new Date().toISOString()}
**Consensus:** ${consensus.averageAgreement.toFixed(1)}%

## Models

${results.map(r => `- **${r.modelName}** (${r.duration}ms) - ${r.expertise}`).join('\n')}

## Synthesis

${synthesis}
`;

  if (llmSynthesis) {
    content += `\n## Synthesized Response (${llmSynthesis.modelName}, ${llmSynthesis.duration}ms)\n\n${llmSynthesis.output}\n`;
  }

  content += `\n## Full Outputs\n\n${results.map(r => `### ${r.modelName}\n\n${r.output}`).join('\n\n---\n\n')}\n`;

  writeFileSync(filepath, content);
  return filepath;
}

/**
 * Estimate token count from prompt text
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Generate JSON output for machine-readable results
 */
function generateJsonOutput(prompt, results, consensus, tier, failures = [], modelCount = results.length) {
  const modelResults = results.map(r => ({
    model: r.model,
    modelName: r.modelName,
    expertise: r.expertise,
    duration: r.duration,
    output: r.output
  }));

  const failureResults = failures.map(f => ({
    model: f.model,
    modelName: f.modelName,
    error: f.reason
  }));

  const agreements = {};
  for (const [pair, score] of Object.entries(consensus.agreements)) {
    agreements[pair] = parseFloat(score.toFixed(2));
  }

  const totalTokens = estimateTokens(prompt) * modelCount;

  return {
    verdict: consensus.consensusLevel,
    confidence: parseFloat((consensus.averageAgreement / 100).toFixed(2)),
    models: modelResults,
    failures: failureResults.length > 0 ? failureResults : undefined,
    agreements,
    consensusLevel: consensus.consensusLevel,
    tier,
    prompt,
    estimatedTokens: totalTokens,
    timestamp: new Date().toISOString()
  };
}

/**
 * Main debate mode function
 */
export async function debateMode(prompt, options = {}) {
  if (!prompt) {
    console.error('Error: No prompt provided. Usage: panel "<prompt>" [--tier fast|standard|deep] [--format json] [--detach] [--synthesize]');
    process.exit(1);
  }

  const tier = options.tier || 'standard';
  const format = options.format || 'text';

  // Determine which models to run (default: all)
  let activeModels = Object.entries(MODELS);
  if (options.models) {
    const selected = options.models.split(',').map(s => s.trim());
    activeModels = activeModels.filter(([key]) => selected.includes(key));
    if (activeModels.length === 0) {
      console.error(`Error: No valid models selected. Available: ${Object.keys(MODELS).join(', ')}`);
      process.exit(1);
    }
  }

  // Handle detached mode — ephemeral one-shot background process
  if (options.detach) {
    const result = await spawnBackground('panel', {
      prompt,
      options: { tier, format }
    });
    console.log(`${YELLOW}Job ${result.jobId} spawned (PID: ${result.pid})${RESET}`);
    console.log(`Check status: omo jobs ${result.jobId}`);
    return { jobId: result.jobId, detached: true };
  }

  if (format !== 'json') {
    console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
    console.log(`${BLUE}  Debate Mode - Phase 2${RESET}`);
    console.log(`${BLUE}  Quality Tier: ${tier.toUpperCase()}${RESET}`);
    console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

    const estimatedTokens = estimateTokens(prompt);
    const totalEstTokens = estimatedTokens * activeModels.length;
    console.log(`${YELLOW}Running ${activeModels.length} model${activeModels.length > 1 ? 's' : ''} in parallel...${RESET}`);
    console.log(`${YELLOW}Est. tokens: ~${estimatedTokens} per model × ${activeModels.length} = ~${totalEstTokens} total${RESET}\n`);
  }

  const startTime = Date.now();
  const useCache = options.cache !== false;
  const promises = activeModels.map(([key, config]) => {
    if (format !== 'json') {
      process.stdout.write(`${config.color}  ▶ ${config.name}${RESET} `);
    }
    return withRetry(
      () => runModel(key, config, prompt, useCache),
      {
        maxRetries: 2,
        baseDelay: 1000,
        onRetry: (err, attempt) => {
          if (format !== 'json') {
            process.stdout.write(`${YELLOW}↻${RESET} `);
          }
        }
      }
    ).then(result => {
      if (format !== 'json') {
        if (result.cached) {
          process.stdout.write(`${config.color}✓${RESET} CACHED (${Math.round(result.cacheAge / 1000)}s ago)\n`);
        } else {
          process.stdout.write(`${config.color}✓${RESET} (${result.duration}ms)\n`);
        }
      }
      return { status: 'fulfilled', value: result };
    }).catch(err => {
      if (format !== 'json') {
        process.stdout.write(`${config.color}✗${RESET} ERROR\n`);
      }
      return { status: 'rejected', reason: err.message, model: key, modelName: config.name };
    });
  });

  const settled = await Promise.all(promises);
  const results = settled.filter(r => r.status === 'fulfilled').map(r => r.value);
  const failures = settled.filter(r => r.status === 'rejected');

  if (results.length === 0) {
    console.error(`\n${COLORS.red}Error: All models failed.${RESET}`);
    for (const f of failures) {
      console.error(`  ${f.modelName}: ${f.reason}`);
    }
    process.exit(1);
  }

  const totalTime = Date.now() - startTime;

  if (format !== 'json') {
    const successCount = results.length;
    const failCount = failures.length;
    if (failCount > 0) {
      console.log(`\n${YELLOW}${successCount}/${successCount + failCount} models succeeded in ${totalTime}ms${RESET}\n`);
      console.log(`${YELLOW}Failures:${RESET}`);
      for (const f of failures) {
        console.log(`  ${COLORS.red}✗${RESET} ${f.modelName}: ${f.reason}`);
      }
      console.log();
    } else {
      console.log(`\n${YELLOW}All ${successCount} models completed in ${totalTime}ms${RESET}\n`);
    }
    console.log(`${BLUE}Analyzing consensus...${RESET}\n`);
  }

  const consensus = analyzeConsensus(results);

  // Optional LLM-based synthesis
  let llmSynthesis = null;
  if (options.synthesize) {
    if (format !== 'json') {
      console.log(`${BLUE}Running synthesizer...${RESET}`);
    }
    try {
      llmSynthesis = await runSynthesizer(results, prompt);
      if (format !== 'json') {
        console.log(`${BLUE}✓ Synthesizer completed (${llmSynthesis.duration}ms)${RESET}\n`);
      }
    } catch (err) {
      if (format !== 'json') {
        console.log(`${YELLOW}⚠ Synthesizer failed: ${err.message}${RESET}\n`);
      }
    }
  }

  // Output JSON if requested
  if (format === 'json') {
    const jsonOutput = generateJsonOutput(prompt, results, consensus, tier, failures, activeModels.length);
    if (llmSynthesis) {
      jsonOutput.synthesis = llmSynthesis.output;
    }
    console.log(JSON.stringify(jsonOutput, null, 2));
    return jsonOutput;
  }

  const synthesis = generateSynthesis(results, consensus, tier);

  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}  RESULTS${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

  console.log(synthesis);
  console.log();

  if (llmSynthesis) {
    console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
    console.log(`${BLUE}  SYNTHESIZED RESPONSE${RESET}`);
    console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);
    console.log(llmSynthesis.output);
    console.log();
  }

  const artifactPath = saveArtifact(prompt, results, consensus, synthesis, tier, llmSynthesis);
  console.log(`${YELLOW}💾 Saved to: ${artifactPath}${RESET}\n`);

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

  return { consensus, results, synthesis };
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  // Parse flags
  const tierIndex = args.indexOf('--tier');
  const tier = tierIndex >= 0 ? args[tierIndex + 1] : 'standard';

  const formatIndex = args.indexOf('--format');
  const format = formatIndex >= 0 ? args[formatIndex + 1] : 'text';

  const modelsIndex = args.indexOf('--models');
  const models = modelsIndex >= 0 ? args[modelsIndex + 1] : null;

  const detach = args.includes('--detach');
  const synthesize = args.includes('--synthesize');
  const cache = !args.includes('--no-cache');

  // Filter out flags and their values from args
  const filteredArgs = args.filter((_, i) => {
    if (i === tierIndex || i === tierIndex + 1) return false;
    if (i === formatIndex || i === formatIndex + 1) return false;
    if (i === modelsIndex || i === modelsIndex + 1) return false;
    if (args[i] === '--detach') return false;
    if (args[i] === '--synthesize') return false;
    if (args[i] === '--no-cache') return false;
    return true;
  });

  const prompt = filteredArgs.join(' ');

  debateMode(prompt, { tier, format, models, detach, synthesize, cache }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
