#!/usr/bin/env node
/**
 * Shared configuration for Ollama CC commands
 */

import { homedir } from 'os';
import { join } from 'path';
import { readFile } from 'fs/promises';

export const MODELS = {
  'glm-5.1': {
    name: 'glm-5.1:cloud',
    context: '200K',
    bestFor: ['debugging', 'coding', 'architecture', 'agentic'],
    reason: 'SWE-Bench Pro SOTA, 8-hour agent support',
    color: '\x1b[36m', // Cyan
    expertise: 'Systems architecture, agentic debugging'
  },
  'kimi': {
    name: 'kimi-k2.6:cloud',
    context: '256K',
    bestFor: ['multimodal', 'ui', 'visual', 'reasoning'],
    reason: 'Cross-modal, UI→code generation',
    color: '\x1b[32m', // Green
    expertise: 'Multimodal reasoning, UI-to-code generation'
  },
  'gemma4': {
    name: 'gemma4:31b-cloud',
    context: '256K',
    bestFor: ['ocr', 'document', 'refactor', 'transform'],
    reason: 'Native OCR, Apache 2.0, function calling',
    color: '\x1b[35m', // Magenta
    expertise: 'Document OCR, code refactoring'
  }
};

export const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m'
};

export const KEYWORD_MAP = [
  { patterns: ['debug', 'error', 'fix', 'why', 'investigate', 'trace', 'bug'], model: 'glm-5.1', category: 'Debugging' },
  { patterns: ['design', 'architecture', 'plan', 'system', 'structure'], model: 'glm-5.1', category: 'Architecture' },
  { patterns: ['code', 'implement', 'write.*function', 'create.*class', 'programming'], model: 'glm-5.1', category: 'Coding' },
  { patterns: ['ocr', 'document', 'parse', 'extract.*text', 'pdf', 'scan', 'image.*text'], model: 'gemma4', category: 'Document/OCR' },
  { patterns: ['refactor', 'transform', 'rename', 'migrate', 'mechanical'], model: 'gemma4', category: 'Refactoring' },
  { patterns: ['ui', 'visual', 'screenshot', 'image', 'multimodal', 'from.*design'], model: 'kimi', category: 'Visual/Multimodal' },
  { patterns: ['review', 'analyze', 'check', 'audit'], model: 'glm-5.1', category: 'Analysis' }
];

export const COMPILED_KEYWORD_MAP = KEYWORD_MAP.map(mapping => ({
  ...mapping,
  compiledPatterns: mapping.patterns.map(p => new RegExp(p.replace(/\./g, '\\.'), 'i'))
}));

export const OLLAMA_ENV = {
  OLLAMA_KEEP_ALIVE: process.env.OLLAMA_KEEP_ALIVE || '1h',
  OLLAMA_NUM_PARALLEL: process.env.OLLAMA_NUM_PARALLEL || '4',
  OLLAMA_FLASH_ATTENTION: process.env.OLLAMA_FLASH_ATTENTION || '1'
};

export const TIMEOUT_MS = 3600000; // 1 hour

/**
 * Role-based configuration for intent routing
 * Maps roles to models and capabilities
 */
export const ROLES = {
  investigator: {
    description: 'Debugging and root cause analysis specialist',
    preferredModel: 'glm-5.1',
    traits: ['analytical', 'methodical', 'thorough'],
    systemPrompt: 'You are a debugging expert. Focus on systematic root cause analysis.'
  },
  executor: {
    description: 'Code implementation specialist',
    preferredModel: 'glm-5.1',
    traits: ['pragmatic', 'clean-code', 'efficient'],
    systemPrompt: 'You are a skilled implementer. Write clean, well-tested code.'
  },
  reviewer: {
    description: 'Code review and quality assurance specialist',
    preferredModel: 'glm-5.1',
    traits: ['critical', 'constructive', 'detail-oriented'],
    systemPrompt: 'You are a thorough code reviewer. Find issues, suggest improvements.'
  },
  architect: {
    description: 'System design and architecture specialist',
    preferredModel: 'glm-5.1',
    traits: ['strategic', 'scalable-thinking', 'trade-off-aware'],
    systemPrompt: 'You are a systems architect. Consider trade-offs and long-term implications.'
  },
  educator: {
    description: 'Explanation and teaching specialist',
    preferredModel: 'kimi',
    traits: ['clear', 'patient', 'example-driven'],
    systemPrompt: 'You are an excellent teacher. Use analogies and clear explanations.'
  },
  refactorer: {
    description: 'Code transformation and modernization specialist',
    preferredModel: 'gemma4',
    traits: ['precise', 'mechanical', 'preservative'],
    systemPrompt: 'You are a refactoring expert. Preserve behavior while improving structure.'
  },
  documenter: {
    description: 'Document processing and OCR specialist',
    preferredModel: 'gemma4',
    traits: ['accurate', 'structured', 'detail-focused'],
    systemPrompt: 'You are a document processing expert. Extract and structure information accurately.'
  },
  designer: {
    description: 'UI/UX and visual design specialist',
    preferredModel: 'kimi',
    traits: ['visual', 'creative', 'accessible'],
    systemPrompt: 'You are a UI/UX designer. Focus on user experience and accessibility.'
  },
  tester: {
    description: 'Testing and quality assurance specialist',
    preferredModel: 'glm-5.1',
    traits: ['thorough', 'edge-case-aware', 'systematic'],
    systemPrompt: 'You are a testing expert. Cover edge cases and failure modes.'
  },
  generalist: {
    description: 'General purpose assistant',
    preferredModel: 'kimi',
    traits: ['adaptable', 'balanced', 'helpful'],
    systemPrompt: 'You are a helpful coding assistant.'
  }
};

/**
 * Intent pattern configuration
 * Defines how to detect user intent from prompts
 */
export const INTENT_PATTERNS = {
  confidenceThreshold: 0.3,
  maxAlternatives: 2,
  patternWeights: {
    explicit: 1.0,      // User explicitly states intent
    contextual: 0.7,    // Intent inferred from context
    implicit: 0.4       // Weak signal, used for suggestions
  }
};

export const CONFIDENCE_THRESHOLD = INTENT_PATTERNS.confidenceThreshold;

/**
 * Default configuration
 */
export const DEFAULT_CONFIG = {
  default_model: 'kimi',
  temperature: 0.7,
  code_model: 'glm-5.1',
  review_model: 'glm-5.1'
};

/**
 * Load user configuration from ~/.ollama-cli/config.json
 * Merges with defaults and returns the combined config
 */
export async function loadUserConfig() {
  const configPath = join(homedir(), '.ollama-cli', 'config.json');

  try {
    const content = await readFile(configPath, 'utf-8');
    const userConfig = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...userConfig };
  } catch (err) {
    // Config file doesn't exist or is invalid, return defaults
    if (err.code !== 'ENOENT') {
      console.warn(`[ollama] Warning: Could not load config from ${configPath}: ${err.message}`);
    }
    return { ...DEFAULT_CONFIG };
  }
}
