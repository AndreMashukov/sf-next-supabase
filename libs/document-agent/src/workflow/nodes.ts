import {
  draftDocumentHtml,
  formatValidationErrorsForRepair,
  planDocument,
  repairDocumentHtml,
} from '../together-client';
import {
  critiqueRulesAdherence,
  mergeValidationReports,
  validateDocumentHtml,
} from '../validation';
import { normalizeGeneratedHtmlFragment } from '../validation/normalize-html';
import { classifyRuleRisk } from '../validation/risk';
import type { PublishDecision, ValidationReport } from '../validation/types';
import { formatRulesForPrompt, type DocumentAgentStateType } from './state';

export async function loadRulesNode(
  state: DocumentAgentStateType,
): Promise<Partial<DocumentAgentStateType>> {
  return {
    rulesText: formatRulesForPrompt(state.rules),
  };
}

export async function planDocumentNode(
  state: DocumentAgentStateType,
): Promise<Partial<DocumentAgentStateType>> {
  const plan = await planDocument(state.text, state.rules);
  return { plan };
}

export async function draftHtmlNode(
  state: DocumentAgentStateType,
): Promise<Partial<DocumentAgentStateType>> {
  const htmlFragment = normalizeGeneratedHtmlFragment(
    await draftDocumentHtml(state.text, state.rulesText, state.plan),
  );
  return { htmlFragment };
}

export async function validateHtmlNode(
  state: DocumentAgentStateType,
): Promise<Partial<DocumentAgentStateType>> {
  const validationReport = await validateDocumentHtml(state.htmlFragment, state.rules);
  return { validationReport };
}

export async function critiqueRulesNode(
  state: DocumentAgentStateType,
): Promise<Partial<DocumentAgentStateType>> {
  const deterministic =
    state.validationReport ??
    ({
      passed: true,
      findings: [],
      errorCount: 0,
      warningCount: 0,
    } satisfies ValidationReport);

  const criticFindings = await critiqueRulesAdherence(
    state.text,
    state.rules,
    state.htmlFragment,
  );

  return {
    validationReport: mergeValidationReports(deterministic, criticFindings),
  };
}

export async function repairHtmlNode(
  state: DocumentAgentStateType,
): Promise<Partial<DocumentAgentStateType>> {
  const validationReport = state.validationReport as ValidationReport;
  const repairedHtml = await repairDocumentHtml(
    state.text,
    state.rulesText,
    state.htmlFragment,
    formatValidationErrorsForRepair(validationReport.findings),
    state.plan,
  );

  return {
    htmlFragment: normalizeGeneratedHtmlFragment(repairedHtml),
    retryCount: state.retryCount + 1,
  };
}

export async function rejectNode(
  state: DocumentAgentStateType,
): Promise<Partial<DocumentAgentStateType>> {
  const validationReport = state.validationReport;
  const summary = validationReport
    ? formatValidationErrorsForRepair(validationReport.findings)
    : 'Unknown validation failure';

  return {
    publishDecision: 'reject',
    errorMessage: `Document validation failed after ${state.retryCount} repair attempt(s):\n${summary}`,
  };
}

export async function publishNode(
  state: DocumentAgentStateType,
): Promise<Partial<DocumentAgentStateType>> {
  return {
    riskLevel: classifyRuleRisk(state.rules),
    publishDecision: 'auto_publish' satisfies PublishDecision,
  };
}

export function routeAfterValidation(
  state: DocumentAgentStateType,
): 'critique' | 'repair' | 'reject' {
  const validationReport = state.validationReport;
  if (!validationReport) {
    return 'reject';
  }

  if (validationReport.passed) {
    return 'critique';
  }

  if (state.retryCount < state.maxRetries) {
    return 'repair';
  }

  return 'reject';
}

export function routeAfterCritique(
  state: DocumentAgentStateType,
): 'publish' | 'repair' | 'reject' {
  const validationReport = state.validationReport;
  if (!validationReport) {
    return 'reject';
  }

  if (validationReport.passed) {
    return 'publish';
  }

  if (state.retryCount < state.maxRetries) {
    return 'repair';
  }

  return 'reject';
}
