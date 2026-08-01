import {
  createValidationReport,
  type DocumentRule,
  type ValidationReport,
} from './types';
import { validateHtmlStructure } from './html-validator';
import { validateMermaidBlocks } from './mermaid-validator';
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
  const findings = [
    ...validateNonEmpty(htmlFragment),
    ...validateSecurity(htmlFragment),
    ...validateAllowedTags(htmlFragment),
    ...validateMermaidBlocks(htmlFragment),
    ...validatePlotlyBlocks(htmlFragment),
    ...(await validateHtmlStructure(htmlFragment)),
  ];

  return createValidationReport(findings);
}

export * from './types';
export * from './html-validator';
export * from './security-validator';
export * from './mermaid-validator';
export * from './plotly-validator';
export * from './rules-critic';
export * from './risk';
