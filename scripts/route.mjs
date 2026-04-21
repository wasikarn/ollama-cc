#!/usr/bin/env node
/**
 * OMO - Route Command
 * Intent-based model routing with XML prompt blocks
 */

import { spawn } from 'child_process';
import { MODELS, COMPILED_KEYWORD_MAP, OLLAMA_ENV, COLORS } from './lib/config.mjs';
import { detectModelFromIntent, detectComplexity } from './lib/intent-router.mjs';
import { createIntentPrompt, createMinimalPrompt } from './lib/prompt-builder.mjs';
import { log, withRetry, resolveModelName } from './lib/utils.mjs';

/**
 * Detect best model using intent-based classification
 * Falls back to keyword matching for backward compatibility
 */
export function detectModel(prompt) {
  // Try intent-based detection first
  const intentResult = detectModelFromIntent(prompt);
  if (intentResult.confidence >= 0.3) {
    return {
      model: intentResult.model,
      category: intentResult.category,
      reason: intentResult.reason,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      role: intentResult.role
    };
  }

  // Fallback to keyword matching (pre-compiled regexes)
  const lowerPrompt = prompt.toLowerCase();
  for (const mapping of COMPILED_KEYWORD_MAP) {
    for (const regex of mapping.compiledPatterns) {
      if (regex.test(lowerPrompt)) {
        return {
          model: MODELS[mapping.model].name,
          category: mapping.category,
          reason: MODELS[mapping.model].reason,
          intent: 'KEYWORD_MATCH',
          confidence: 0.5
        };
      }
    }
  }

  // Default
  return {
    model: MODELS.kimi.name,
    category: 'General',
    reason: 'Balanced, 256K context',
    intent: 'DEFAULT',
    confidence: 0.3
  };
}

/**
 * Format intent classification for display
 */
function formatIntentClassification(classification) {
  const { intent, confidence, role, recommendedModel, description, alternatives } = classification;

  let output = '';
  output += `${COLORS.cyan}Intent:${COLORS.reset} ${intent}\n`;
  output += `${COLORS.cyan}Confidence:${COLORS.reset} ${(confidence * 100).toFixed(1)}%\n`;
  output += `${COLORS.cyan}Role:${COLORS.reset} ${role}\n`;
  output += `${COLORS.cyan}Description:${COLORS.reset} ${description}\n`;
  output += `${COLORS.cyan}Recommended Model:${COLORS.reset} ${recommendedModel}\n`;

  if (alternatives && alternatives.length > 0) {
    output += `${COLORS.cyan}Alternatives:${COLORS.reset}\n`;
    for (const alt of alternatives) {
      output += `  - ${alt.intent} (${(alt.confidence * 100).toFixed(1)}%)\n`;
    }
  }

  return output;
}

/**
 * Run ollama with given model and prompt
 */
function runOllama(model, prompt, options = {}) {
  return new Promise((resolve, reject) => {
    const useStructured = options.structured !== false;

    // Build structured prompt if enabled
    let finalPrompt = prompt;
    if (useStructured && options.classification) {
      try {
        finalPrompt = createIntentPrompt(prompt, {
          classification: options.classification,
          includeIntent: true
        });
      } catch (err) {
        log('warn', `Failed to build structured prompt: ${err.message}`);
        // Fall back to minimal
        finalPrompt = createMinimalPrompt(prompt, model);
      }
    }

    const args = ['run', model, finalPrompt];

    if (options.nowordwrap !== false) {
      args.push('--nowordwrap');
    }

    const child = spawn('ollama', args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...OLLAMA_ENV
      }
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data;
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn ollama: ${err.message}`));
    });
  });
}

/**
 * Run ollama with retry logic
 */
async function runOllamaWithRetry(model, prompt, options = {}) {
  return withRetry(
    () => runOllama(model, prompt, options),
    {
      maxRetries: 3,
      baseDelay: 1000,
      onRetry: (err, attempt) => {
        log('warn', `Retry ${attempt}/3 after error: ${err.message}`);
      }
    }
  );
}

/**
 * Estimate token count from prompt text
 * Rough approximation: ~4 chars per token
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Main smart router function
 */
export async function smartRouter(prompt, options = {}) {
  if (!prompt) {
    log('error', 'No prompt provided. Usage: route "<prompt>" [--explain] [--show-intent] [--dry-run] [--budget] [--vertical]');
    process.exit(1);
  }

  // Get intent-based classification (single call — detectModelFromIntent internally classifies)
  const detection = detectModelFromIntent(prompt, { verbose: options.verbose, vertical: options.vertical });

  // Compute complexity for display
  const complexity = detectComplexity(prompt);
  const classification = {
    intent: detection.intent,
    confidence: detection.confidence,
    role: detection.role,
    recommendedModel: detection.modelKey,
    description: detection.category,
    alternatives: detection.alternatives
  };

  // Show intent classification if requested
  if (options.showIntent) {
    log('info', 'Intent Classification:');
    console.log(formatIntentClassification(classification));
    console.log('');
  }

  // Show explanation if requested
  if (options.explain || options.dryRun || options.budget) {
    const estimatedTokens = estimateTokens(prompt);
    const estimatedOutput = Math.round(estimatedTokens * 1.5);

    log('info', 'Smart Router Analysis:');
    console.log(`  Prompt: ${prompt.slice(0, 60)}...`);
    console.log(`  Intent: ${detection.intent}`);
    console.log(`  Confidence: ${(detection.confidence * 100).toFixed(1)}%`);
    console.log(`  Role: ${detection.role} (${detection.roleDescription})`);
    console.log(`  Category: ${detection.category}`);
    if (options.vertical || detection.complexityAdjusted) {
      console.log(`  Complexity: ${complexity.tier} (score: ${complexity.score}${complexity.factors.length > 0 ? ', ' + complexity.factors.join(', ') : ''})`);
    }
    console.log(`  Routed to: ${detection.model}`);
    console.log(`  Reason: ${detection.reason}`);
    console.log(`  Expertise: ${detection.expertise}`);
    if (detection.alternatives && detection.alternatives.length > 0) {
      console.log(`  Alternatives: ${detection.alternatives.map(a => a.intent).join(', ')}`);
    }
    console.log(`  Est. tokens: ~${estimatedTokens} in / ~${estimatedOutput} out`);
    console.log('');
  }

  // Dry run: show analysis and exit without executing
  if (options.dryRun) {
    log('info', 'Dry run — no execution. Remove --dry-run to execute.');
    return;
  }

  // Budget-only: show analysis and exit without executing
  if (options.budget && !options.dryRun) {
    log('info', 'Budget estimate shown. Remove --budget to execute.');
    return;
  }

  log('model', `Smart route (${detection.intent.toLowerCase()}, ${(detection.confidence * 100).toFixed(0)}%) → ${detection.model}`);

  try {
    await runOllamaWithRetry(detection.model, prompt, {
      structured: options.structured,
      classification: detection,
      nowordwrap: options.nowordwrap
    });
  } catch (error) {
    log('error', error.message);
    process.exit(1);
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const args = process.argv.slice(2);

    // Parse flags
    const explainFlag = args.includes('--explain');
    const showIntentFlag = args.includes('--show-intent');
    const verboseFlag = args.includes('--verbose');
    const noStructuredFlag = args.includes('--no-structured');
    const dryRunFlag = args.includes('--dry-run');
    const budgetFlag = args.includes('--budget');
    const verticalFlag = args.includes('--vertical');

    // Parse --model flag
    const modelFlagIndex = args.findIndex(a => a === '--model');
    let modelOverride = null;
    if (modelFlagIndex >= 0 && modelFlagIndex + 1 < args.length) {
      modelOverride = resolveModelName(args[modelFlagIndex + 1]);
      args.splice(modelFlagIndex, 2);
    }

    // Find prompt (first positional arg, not a flag)
    const promptIndex = args.findIndex(a => !a.startsWith('--'));
    const prompt = promptIndex >= 0 ? args[promptIndex] : null;

    if (modelOverride) {
      log('model', `Model override: ${modelOverride}`);
      if (dryRunFlag || budgetFlag) {
        const estimatedTokens = Math.ceil((prompt || '').length / 4);
        log('info', `Dry run: ${modelOverride} | Est. tokens: ~${estimatedTokens}`);
        return;
      }
      await runOllamaWithRetry(modelOverride, prompt, { structured: !noStructuredFlag }).catch(err => {
        log('error', err.message);
        process.exit(1);
      });
    } else {
      await smartRouter(prompt, {
        explain: explainFlag,
        showIntent: showIntentFlag,
        verbose: verboseFlag,
        structured: !noStructuredFlag,
        dryRun: dryRunFlag,
        budget: budgetFlag,
        vertical: verticalFlag
      });
    }
  })();
}
