import type { RulePromptRecord } from '@sf/api-domain';
import { generateVerifiedDocument, mapRulesFromRecords } from '@sf/document-agent';

export class InProcessDocumentAgentService {
  async generateDocument(
    title: string,
    text: string,
    rules: RulePromptRecord[],
  ): Promise<string> {
    const result = await generateVerifiedDocument({
      title,
      text,
      rules: mapRulesFromRecords(rules),
    });

    return result.htmlFragment;
  }
}
