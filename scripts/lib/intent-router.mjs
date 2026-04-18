#!/usr/bin/env node
/**
 * Intent Router - v0.3.0
 * Intent-based classification system for model routing
 * Replaces simple keyword matching with contextual intent detection
 */

import { MODELS, ROLES, INTENT_PATTERNS, CONFIDENCE_THRESHOLD } from './config.mjs';

/**
 * Intent definitions with role-based routing
 */
export const INTENTS = {
  DEBUG: {
    patterns: [
      'debug', 'error', 'fix', 'why', 'investigate', 'trace', 'bug',
      'broken', 'fails?', 'crash', 'exception', 'stack trace', 'logs?',
      'not working', 'doesn\'t work', 'stopped working', 'regression'
    ],
    role: 'investigator',
    confidence: 0.8,
    primaryModel: 'glm-5.1',
    description: 'Debugging and error investigation'
  },
  IMPLEMENT: {
    patterns: [
      'code', 'implement', 'write.*function', 'create.*class',
      'programming', 'build', 'develop', 'write.*script',
      'function to', 'class that', 'implement.*method',
      'generate code', 'coding task'
    ],
    role: 'executor',
    confidence: 0.75,
    primaryModel: 'glm-5.1',
    description: 'Code implementation and generation'
  },
  REVIEW: {
    patterns: [
      'review', 'analyze', 'check', 'audit', 'assess',
      'evaluate', 'critique', 'inspect', 'verify',
      'code review', 'pr review', 'look over', 'examine'
    ],
    role: 'reviewer',
    confidence: 0.8,
    primaryModel: 'glm-5.1',
    description: 'Code review and analysis'
  },
  DESIGN: {
    patterns: [
      'design', 'architecture', 'plan', 'system', 'structure',
      'pattern', 'blueprint', 'proposal', 'approach',
      'how should', 'best way to', 'design.*pattern',
      'microservices?', 'scalable', 'system design'
    ],
    role: 'architect',
    confidence: 0.85,
    primaryModel: 'glm-5.1',
    description: 'System design and architecture'
  },
  EXPLAIN: {
    patterns: [
      'explain', 'how does', 'what is', 'why is', 'clarify',
      'teach', 'understand', 'help.*understand',
      'how do', 'what does', 'meaning of', 'purpose of'
    ],
    role: 'educator',
    confidence: 0.7,
    primaryModel: 'kimi',
    description: 'Explanation and education'
  },
  REFACTOR: {
    patterns: [
      'refactor', 'transform', 'rename', 'migrate', 'mechanical',
      'restructure', 'clean up', 'simplify', 'optimize',
      'modernize', 'update.*code', 'convert.*to'
    ],
    role: 'refactorer',
    confidence: 0.8,
    primaryModel: 'gemma4',
    description: 'Code refactoring and transformation'
  },
  DOCUMENT: {
    patterns: [
      'ocr', 'document', 'parse', 'extract.*text', 'pdf',
      'scan', 'image.*text', 'read.*image', 'extract.*data',
      'text from', 'parse.*document', 'document.*processing'
    ],
    role: 'documenter',
    confidence: 0.9,
    primaryModel: 'gemma4',
    description: 'Document OCR and text extraction'
  },
  VISUAL: {
    patterns: [
      'ui', 'visual', 'screenshot', 'image', 'multimodal',
      'from.*design', 'mockup', 'wireframe', 'figma',
      'convert.*to.*react', 'to.*html', 'to.*css',
      'layout', 'component.*design'
    ],
    role: 'designer',
    confidence: 0.85,
    primaryModel: 'kimi',
    description: 'UI/Visual and multimodal tasks'
  },
  TEST: {
    patterns: [
      'test', 'spec', 'unit test', 'integration test',
      'test.*case', 'assertion', 'mock', 'coverage',
      'jest', 'pytest', 'mocha', 'vitest',
      'write.*test', 'create.*test', 'test.*function'
    ],
    role: 'tester',
    confidence: 0.75,
    primaryModel: 'glm-5.1',
    description: 'Testing and test generation'
  }
};

/**
 * Pre-compiled intent patterns — built once at module load, not per classify() call.
 */
const COMPILED_INTENTS = Object.fromEntries(
  Object.entries(INTENTS).map(([name, config]) => [
    name,
    {
      ...config,
      compiledPatterns: config.patterns.map(p => {
        const escaped = p.replace(/\*/g, '.*?');
        return {
          any: new RegExp(escaped, 'i'),
          word: new RegExp(`\\b${escaped}\\b`, 'i')
        };
      })
    }
  ])
);

/**
 * Calculate confidence score for a single intent match
 */
function calculateIntentScore(prompt, intentConfig) {
  const lowerPrompt = prompt.toLowerCase();
  let score = 0;
  let matches = 0;

  for (const { any, word } of intentConfig.compiledPatterns) {
    if (any.test(lowerPrompt)) {
      score += word.test(lowerPrompt) ? 0.3 : 0.15;
      matches++;
    }
  }

  if (matches >= 3) score += 0.2;
  if (matches >= 2) score += 0.1;

  return Math.min(score, 1.0);
}

/**
 * Classify intent from prompt
 * Returns the best matching intent with confidence and role info
 */
export function classifyIntent(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return {
      intent: 'UNKNOWN',
      confidence: 0,
      role: 'generalist',
      recommendedModel: 'kimi',
      description: 'General purpose'
    };
  }

  const scores = [];

  for (const [intentName, config] of Object.entries(COMPILED_INTENTS)) {
    const score = calculateIntentScore(prompt, config);
    if (score > 0) {
      scores.push({
        intent: intentName,
        score,
        role: config.role,
        confidence: config.confidence,
        primaryModel: config.primaryModel,
        description: config.description
      });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Return best match if above threshold, otherwise default
  if (scores.length > 0 && scores[0].score >= CONFIDENCE_THRESHOLD) {
    const best = scores[0];
    return {
      intent: best.intent,
      confidence: best.score,
      role: best.role,
      recommendedModel: best.primaryModel,
      description: best.description,
      alternatives: scores.slice(1, 3).map(s => ({
        intent: s.intent,
        confidence: s.score
      }))
    };
  }

  // Default fallback
  return {
    intent: 'GENERAL',
    confidence: 0.5,
    role: 'generalist',
    recommendedModel: 'kimi',
    description: 'General purpose',
    alternatives: scores.slice(0, 2).map(s => ({
      intent: s.intent,
      confidence: s.score
    }))
  };
}

/**
 * Get role configuration for a given role name
 */
export function getRoleConfig(roleName) {
  return ROLES[roleName] || ROLES.generalist;
}

/**
 * Detect model from intent classification
 * Main entry point for model detection
 */
export function detectModelFromIntent(prompt, options = {}) {
  const classification = classifyIntent(prompt);
  const roleConfig = getRoleConfig(classification.role);

  // Use role's preferred model, or fall back to classified model
  const modelKey = classification.recommendedModel;
  const modelConfig = MODELS[modelKey] || MODELS.kimi;

  const result = {
    model: modelConfig.name,
    modelKey,
    intent: classification.intent,
    confidence: classification.confidence,
    role: classification.role,
    roleDescription: roleConfig.description,
    category: classification.description,
    reason: modelConfig.reason,
    expertise: modelConfig.expertise,
    color: modelConfig.color,
    alternatives: classification.alternatives || []
  };

  // Include full classification if verbose mode
  if (options.verbose) {
    result.classification = classification;
    result.roleConfig = roleConfig;
  }

  return result;
}

/**
 * Get suggested prompt template based on intent
 */
export function getPromptTemplate(intent) {
  const templates = {
    DEBUG: 'Focus on root cause analysis. Provide step-by-step debugging approach.',
    IMPLEMENT: 'Write clean, well-documented code. Include usage examples.',
    REVIEW: 'Analyze for correctness, performance, and maintainability. Be specific.',
    DESIGN: 'Consider trade-offs and scalability. Provide clear rationale.',
    EXPLAIN: 'Use clear analogies. Start with the big picture, then details.',
    REFACTOR: 'Preserve behavior while improving structure. Explain changes made.',
    DOCUMENT: 'Extract and structure text accurately. Preserve formatting.',
    VISUAL: 'Focus on responsive design and accessibility. Match the visual intent.',
    TEST: 'Cover edge cases and error scenarios. Follow testing best practices.',
    GENERAL: 'Provide a helpful, comprehensive response.'
  };

  return templates[intent] || templates.GENERAL;
}

/**
 * Batch classify multiple prompts for efficiency
 */
export function batchClassify(prompts) {
  return prompts.map(prompt => ({
    prompt: prompt.slice(0, 50),
    classification: classifyIntent(prompt)
  }));
}
