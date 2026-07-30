import {
  formatRulesForPrompt,
  type DocumentGeneratorService,
  type QuizGeneratorService,
  type RulePromptRecord,
} from '@sf/api-domain';
import type { Quiz } from '@sf/shared-types';
import { DocumentAgentClient } from './document-agent.client';
import { TogetherAiClient } from './together-ai.client';

export class CompositeDocumentGeneratorService implements DocumentGeneratorService {
  constructor(
    private readonly togetherAi: TogetherAiClient,
    private readonly documentAgent: DocumentAgentClient | null,
  ) {}

  isAgentEnabled(): boolean {
    return this.documentAgent !== null;
  }

  async generate(title: string, text: string, rules: RulePromptRecord[]): Promise<string> {
    if (this.documentAgent) {
      return this.documentAgent.generateDocument(title, text, rules);
    }

    return this.togetherAi.generateDocumentFromPrompt(text, formatRulesForPrompt(rules));
  }
}

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
