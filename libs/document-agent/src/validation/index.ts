import {
  createValidationReport,
  type DocumentRule,
  type ValidationReport,
} from './types';
import { validateHtmlStructure } from './html-validator';
import { validateMermaidBlocks } from './mermaid-validator';
import { normalizeGeneratedHtmlFragment } from './normalize-html';
import { validatePlotlyBlocks } from './plotly-validator';
import {
  validateAllowedTags,
  validateNonEmpty,
  validateSecurity,
} from './security-validator';

export async function validateDocumentHtml(
  htmlFragment: string,
  _rules: DocumentRule[] = [],
): Promise<ValidationReport> {
  const normalized = normalizeGeneratedHtmlFragment(htmlFragment);
  const findings = [
    ...validateNonEmpty(normalized),
    ...validateSecurity(normalized),
    ...validateAllowedTags(normalized),
    ...validateMermaidBlocks(normalized),
    ...validatePlotlyBlocks(normalized),
    ...(await validateHtmlStructure(normalized)),
  ];

  return createValidationReport(findings);
}

export * from './types';
export * from './html-validator';
export * from './normalize-html';
export * from './security-validator';
export * from './mermaid-validator';
export * from './plotly-validator';
export * from './rules-critic';
export * from './risk';
