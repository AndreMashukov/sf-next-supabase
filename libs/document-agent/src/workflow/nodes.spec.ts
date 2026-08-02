import { describe, expect, it } from 'vitest';
import { createValidationReport } from '../validation/types';
import {
  publishNode,
  rejectNode,
  routeAfterCritique,
  routeAfterValidation,
} from './nodes';
import type { DocumentAgentStateType } from './state';

function createState(overrides: Partial<DocumentAgentStateType>): DocumentAgentStateType {
  return {
    title: 'Test',
    text: 'Generate a document',
    rules: [],
    rulesText: '',
    plan: undefined,
    htmlFragment: '<p>Hello</p>',
    validationReport: undefined,
    retryCount: 0,
    maxRetries: 2,
    riskLevel: undefined,
    publishDecision: undefined,
    errorMessage: undefined,
    ...overrides,
  };
}

describe('workflow routing', () => {
  it('routes deterministic pass to critique', () => {
    const state = createState({
      validationReport: createValidationReport([]),
    });

    expect(routeAfterValidation(state)).toBe('critique');
  });

  it('routes deterministic fail to reject when maxRetries is unset', () => {
    const state = createState({
      validationReport: createValidationReport([
        {
          severity: 'error',
          code: 'SECURITY_DISALLOWED_TAG',
          category: 'security',
          message: 'Disallowed tag',
        },
      ]),
      retryCount: 0,
      maxRetries: undefined as unknown as number,
    });

    expect(routeAfterValidation(state)).toBe('reject');
  });

  it('routes deterministic fail to repair while retries remain', () => {
    const state = createState({
      validationReport: createValidationReport([
        {
          severity: 'error',
          code: 'SECURITY_DISALLOWED_TAG',
          category: 'security',
          message: 'Disallowed tag',
        },
      ]),
      retryCount: 0,
      maxRetries: 2,
    });

    expect(routeAfterValidation(state)).toBe('repair');
  });

  it('routes deterministic fail to reject when retries are exhausted', () => {
    const state = createState({
      validationReport: createValidationReport([
        {
          severity: 'error',
          code: 'SECURITY_DISALLOWED_TAG',
          category: 'security',
          message: 'Disallowed tag',
        },
      ]),
      retryCount: 2,
      maxRetries: 2,
    });

    expect(routeAfterValidation(state)).toBe('reject');
  });

  it('routes critique pass to publish', () => {
    const state = createState({
      validationReport: createValidationReport([]),
    });

    expect(routeAfterCritique(state)).toBe('publish');
  });

  it('routes critique fail to repair while retries remain', () => {
    const state = createState({
      validationReport: createValidationReport([
        {
          severity: 'error',
          code: 'RULE_SEMANTIC_VIOLATION',
          category: 'rules',
          message: '[Diagrams] Missing Mermaid',
        },
      ]),
      retryCount: 1,
      maxRetries: 2,
    });

    expect(routeAfterCritique(state)).toBe('repair');
  });

  it('routes critique fail to reject when retries are exhausted', () => {
    const state = createState({
      validationReport: createValidationReport([
        {
          severity: 'error',
          code: 'RULE_SEMANTIC_VIOLATION',
          category: 'rules',
          message: '[Diagrams] Missing Mermaid',
        },
      ]),
      retryCount: 2,
      maxRetries: 2,
    });

    expect(routeAfterCritique(state)).toBe('reject');
  });

  it('auto-publishes after critique passes', async () => {
    const result = await publishNode(createState({}));
    expect(result.publishDecision).toBe('auto_publish');
  });

  it('sets reject message when validation never passes', async () => {
    const result = await rejectNode(
      createState({
        retryCount: 2,
        validationReport: createValidationReport([
          {
            severity: 'error',
            code: 'RULE_SEMANTIC_VIOLATION',
            category: 'rules',
            message: '[Diagrams] Missing Mermaid',
          },
        ]),
      }),
    );

    expect(result.publishDecision).toBe('reject');
    expect(result.errorMessage).toContain('Document validation failed');
  });
});
