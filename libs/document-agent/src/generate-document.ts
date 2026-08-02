import type {
  DocumentGenerationInput,
  DocumentGenerationResult,
  DocumentRule,
} from './validation/types';
import { DOCUMENT_AGENT_MAX_REPAIR_RETRIES } from '@sf/shared-types';
import { documentAgentGraph } from './workflow/graph';

export interface GenerateDocumentOptions {
  maxRetries?: number;
}

export async function generateVerifiedDocument(
  input: DocumentGenerationInput,
  options: GenerateDocumentOptions = {},
): Promise<DocumentGenerationResult> {
  const maxRetries = options.maxRetries ?? DOCUMENT_AGENT_MAX_REPAIR_RETRIES;
  console.info('[document-agent] LangGraph invoke', {
    title: input.title,
    ruleCount: input.rules.length,
    maxRetries,
  });

  const finalState = await documentAgentGraph.invoke({
    title: input.title,
    text: input.text,
    rules: input.rules,
    rulesText: '',
    htmlFragment: '',
    retryCount: 0,
    maxRetries,
  });

  console.info('[document-agent] LangGraph complete', {
    title: input.title,
    publishDecision: finalState.publishDecision,
    retryCount: finalState.retryCount,
    passed: finalState.validationReport?.passed ?? false,
  });

  if (finalState.publishDecision === 'reject' || !finalState.validationReport?.passed) {
    throw new Error(finalState.errorMessage ?? 'Document validation failed');
  }

  if (!finalState.htmlFragment?.trim()) {
    throw new Error('Document agent returned empty HTML fragment');
  }

  return {
    htmlFragment: finalState.htmlFragment,
    validationReport: finalState.validationReport,
    retryCount: finalState.retryCount,
    riskLevel: finalState.riskLevel ?? 'low',
    publishDecision: finalState.publishDecision ?? 'auto_publish',
    plan: finalState.plan,
  };
}

export function mapRulesFromRecords(
  rules: Array<{ name: string; content: string }>,
): DocumentRule[] {
  return rules.map((rule) => ({
    name: rule.name,
    content: rule.content,
  }));
}

export { documentAgentGraph } from './workflow/graph';
export { validateDocumentHtml } from './validation';
export type {
  DocumentGenerationInput,
  DocumentGenerationResult,
  DocumentRule,
  ValidationFinding,
  ValidationReport,
} from './validation/types';
