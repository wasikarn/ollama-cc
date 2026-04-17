#!/usr/bin/env node
/**
 * Shared configuration for Ollama CC commands
 */

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
    name: 'kimi-k2.5:cloud',
    context: '256K',
    bestFor: ['multimodal', 'ui', 'visual', 'reasoning'],
    reason: 'Cross-modal, UI→code, FREE',
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

export const OLLAMA_ENV = {
  OLLAMA_KEEP_ALIVE: process.env.OLLAMA_KEEP_ALIVE || '1h',
  OLLAMA_NUM_PARALLEL: process.env.OLLAMA_NUM_PARALLEL || '4',
  OLLAMA_FLASH_ATTENTION: process.env.OLLAMA_FLASH_ATTENTION || '1'
};

export const TIMEOUT_MS = 3600000; // 1 hour
