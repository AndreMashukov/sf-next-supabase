import type { DocumentGeneratorService, QuizGeneratorService, RulePromptRecord } from '@sf/api-domain';
import type { Quiz } from '@sf/shared-types';
import { InProcessDocumentAgentService } from './document-agent.service';
import { TogetherAiClient } from './together-ai.client';

export class LangGraphDocumentGeneratorService implements DocumentGeneratorService {
  constructor(private readonly documentAgent = new InProcessDocumentAgentService()) {}

  isAgentEnabled(): boolean {
    return true;
  }

  async generate(title: string, text: string, rules: RulePromptRecord[]): Promise<string> {
    return this.documentAgent.generateDocument(title, text, rules);
  }
}

/** @deprecated Use LangGraphDocumentGeneratorService. Kept as alias for existing imports. */
export const CompositeDocumentGeneratorService = LangGraphDocumentGeneratorService;

export class TogetherQuizGeneratorService implements QuizGeneratorService {
  constructor(private readonly togetherAi: TogetherAiClient) {}

  async generateFromHtml(
    html: string,
    documentTitle: string,
    questionCount: number,
  ): Promise<{ title: string; questions: Quiz['questions'] }> {
    return this.togetherAi.generateQuizFromHtml(html, documentTitle, questionCount);
  }
}
