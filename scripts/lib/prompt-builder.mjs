#!/usr/bin/env node
/**
 * OMO - Prompt Builder
 * XML prompt block system for structured, context-aware prompts
 */

import { getPromptTemplate } from './intent-router.mjs';

/**
 * XML block templates for structured prompts
 */
export const PROMPT_BLOCKS = {
  /**
   * System role block - defines the AI's role and expertise
   */
  system: (role, content, attrs = {}) => {
    const attrsStr = Object.entries(attrs)
      .map(([k, v]) => ` ${k}="${v}"`)
      .join('');
    return `<system role="${role}"${attrsStr}>\n${content}\n</system>`;
  },

  /**
   * Context block - provides background information
   */
  context: (source, content, attrs = {}) => {
    const attrsStr = Object.entries(attrs)
      .map(([k, v]) => ` ${k}="${v}"`)
      .join('');
    return `<context source="${source}"${attrsStr}>\n${content}\n</context>`;
  },

  /**
   * Task block - the main instruction/request
   */
  task: (content, attrs = {}) => {
    const attrsStr = Object.entries(attrs)
      .map(([k, v]) => ` ${k}="${v}"`)
      .join('');
    return `<task${attrsStr}>\n${content}\n</task>`;
  },

  /**
   * Output format specification
   */
  output: (format, content = '', attrs = {}) => {
    const attrsStr = Object.entries(attrs)
      .map(([k, v]) => ` ${k}="${v}"`)
      .join('');
    if (content) {
      return `<output format="${format}"${attrsStr}>\n${content}\n</output>`;
    }
    return `<output format="${format}"${attrsStr} />`;
  },

  /**
   * Constraints block - limitations and requirements
   */
  constraints: (items) => {
    const list = Array.isArray(items) ? items : [items];
    return `<constraints>\n${list.map(i => `  - ${i}`).join('\n')}\n</constraints>`;
  },

  /**
   * Examples block - few-shot examples
   */
  examples: (examples) => {
    const formatted = examples.map((ex, i) =>
      `  <example index="${i + 1}">\n    <input>${ex.input}</input>\n    <output>${ex.output}</output>\n  </example>`
    ).join('\n');
    return `<examples>\n${formatted}\n</examples>`;
  },

  /**
   * Intent guidance block - adds intent-specific instructions
   */
  intent: (intentType, guidance = null) => {
    const template = guidance || getPromptTemplate(intentType);
    return `<intent type="${intentType.toLowerCase()}">\n${template}\n</intent>`;
  },

  /**
   * Metadata block - adds structured metadata
   */
  meta: (data) => {
    const entries = Object.entries(data)
      .map(([k, v]) => `  <${k}>${v}</${k}>`)
      .join('\n');
    return `<meta>\n${entries}\n</meta>`;
  }
};

/**
 * Build a complete prompt from blocks
 */
export function buildPrompt(blocks) {
  if (!Array.isArray(blocks)) {
    throw new Error('Blocks must be an array');
  }

  const built = blocks
    .filter(block => block !== null && block !== undefined && block !== '')
    .map(block => {
      if (typeof block === 'string') return block;
      if (block.type && PROMPT_BLOCKS[block.type]) {
        const fn = PROMPT_BLOCKS[block.type];
        const args = block.args || [];
        return fn(...args);
      }
      return String(block);
    });

  return built.join('\n\n');
}

/**
 * Create a structured prompt with intent-based system message
 */
export function createIntentPrompt(userPrompt, options = {}) {
  const { intent, role, confidence } = options.classification || {};
  const intentType = intent || 'GENERAL';
  const roleName = role || 'assistant';

  const blocks = [
    // System role
    PROMPT_BLOCKS.system(roleName, `${roleName.charAt(0).toUpperCase() + roleName.slice(1)} mode activated. ${getPromptTemplate(intentType)}`,
      { confidence: confidence?.toFixed(2) || '0.5' }),

    // Intent guidance
    options.includeIntent !== false && PROMPT_BLOCKS.intent(intentType),

    // User context if provided
    options.context && PROMPT_BLOCKS.context('user', options.context),

    // Main task
    PROMPT_BLOCKS.task(userPrompt, { priority: options.priority || 'normal' }),

    // Output format
    options.outputFormat && PROMPT_BLOCKS.output(options.outputFormat),

    // Constraints
    options.constraints && PROMPT_BLOCKS.constraints(options.constraints),

    // Examples for few-shot
    options.examples && PROMPT_BLOCKS.examples(options.examples)
  ].filter(Boolean);

  return buildPrompt(blocks);
}

/**
 * Create a minimal prompt (backward compatible)
 */
export function createMinimalPrompt(userPrompt, modelKey) {
  return buildPrompt([
    PROMPT_BLOCKS.system('assistant', `You are a helpful coding assistant using ${modelKey}.`),
    PROMPT_BLOCKS.task(userPrompt)
  ]);
}

/**
 * Create a debate-style prompt with multiple perspectives
 */
export function createDebatePrompt(userPrompt, perspectives) {
  const blocks = [
    PROMPT_BLOCKS.system('debate-moderator', 'Facilitate a structured debate between multiple expert perspectives.'),
    PROMPT_BLOCKS.task(`Topic: ${userPrompt}`),
    PROMPT_BLOCKS.context('perspectives', perspectives.map((p, i) =>
      `  ${i + 1}. ${p.role}: ${p.expertise}`
    ).join('\n')),
    PROMPT_BLOCKS.output('structured', 'Present each perspective clearly, then synthesize a consensus view.')
  ];

  return buildPrompt(blocks);
}

/**
 * Create a code review prompt
 */
export function createReviewPrompt(code, context = {}) {
  const blocks = [
    PROMPT_BLOCKS.system('code-reviewer', 'You are an expert code reviewer. Be thorough, constructive, and specific.'),
    context.language && PROMPT_BLOCKS.meta({ language: context.language, framework: context.framework || 'unknown' }),
    PROMPT_BLOCKS.task('Review the following code for: correctness, performance, security, maintainability, and style.'),
    PROMPT_BLOCKS.context('code', code),
    PROMPT_BLOCKS.constraints([
      'Provide specific line references when possible',
      'Suggest concrete improvements, not just problems',
      'Prioritize issues by severity'
    ]),
    PROMPT_BLOCKS.output('markdown', '## Summary\n...\n## Issues\n...\n## Suggestions\n...')
  ];

  return buildPrompt(blocks);
}

/**
 * Validate prompt blocks structure
 */
export function validateBlocks(blocks) {
  const errors = [];

  for (const block of blocks) {
    if (typeof block === 'object' && block.type) {
      if (!PROMPT_BLOCKS[block.type]) {
        errors.push(`Unknown block type: ${block.type}`);
      }
      if (!Array.isArray(block.args)) {
        errors.push(`Block ${block.type} missing args array`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text) {
  // Rough estimate: ~4 chars per token for English
  return Math.ceil(text.length / 4);
}

/**
 * Build prompt with token limit awareness
 */
export function buildPromptWithLimit(blocks, maxTokens = 8000) {
  let prompt = buildPrompt(blocks);
  let tokens = estimateTokens(prompt);

  // If over limit, try to compress
  if (tokens > maxTokens && blocks.length > 2) {
    // Remove optional blocks from the end
    const essential = blocks.slice(0, 2); // Keep system + task
    prompt = buildPrompt(essential);
    tokens = estimateTokens(prompt);
  }

  return { prompt, tokens };
}
