import { DOCUMENT_AGENT_MAX_REPAIR_RETRIES } from '@sf/shared-types';
import { Annotation } from '@langchain/langgraph';
import type {
  DocumentPlan,
  DocumentRule,
  PublishDecision,
  RiskLevel,
  ValidationReport,
} from '../validation/types';

export const DocumentAgentState = Annotation.Root({
  title: Annotation<string>,
  text: Annotation<string>,
  rules: Annotation<DocumentRule[]>,
  rulesText: Annotation<string>,
  plan: Annotation<DocumentPlan | undefined>,
  htmlFragment: Annotation<string>,
  validationReport: Annotation<ValidationReport | undefined>,
  retryCount: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
  maxRetries: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => DOCUMENT_AGENT_MAX_REPAIR_RETRIES,
  }),
  riskLevel: Annotation<RiskLevel | undefined>,
  publishDecision: Annotation<PublishDecision | undefined>,
  errorMessage: Annotation<string | undefined>,
});

export type DocumentAgentStateType = typeof DocumentAgentState.State;

export function formatRulesForPrompt(rules: DocumentRule[]): string {
  if (rules.length === 0) {
    return '';
  }

  const separator = '─'.repeat(61);
  const ruleBlocks = rules.map((rule, index) => {
    return `${separator}
RULE #${index + 1} - ${rule.name}
${separator}
${rule.content}`;
  });

  return `
${separator}
ADDITIONAL RULES TO FOLLOW:

The user has selected the following rules to guide your response.
Please consider all rules intelligently, prioritizing based on context.

${ruleBlocks.join('\n\n')}

${separator}
END OF RULES

Please generate content that follows these rules while maintaining
coherence and quality.
`;
}
