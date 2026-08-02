import { describe, expect, it, vi } from 'vitest';

vi.mock('@sf/document-agent', () => ({
  generateVerifiedDocument: vi.fn(),
  mapRulesFromRecords: vi.fn((rules: Array<{ name: string; content: string }>) => rules),
}));

import { generateVerifiedDocument } from '@sf/document-agent';
import { InProcessDocumentAgentService } from './document-agent.service';
import { LangGraphDocumentGeneratorService } from './services';

describe('InProcessDocumentAgentService', () => {
  it('returns htmlFragment from generateVerifiedDocument', async () => {
    vi.mocked(generateVerifiedDocument).mockResolvedValue({
      htmlFragment: '<p>Generated</p>',
      validationReport: {
        passed: true,
        findings: [],
        errorCount: 0,
        warningCount: 0,
      },
      retryCount: 0,
      riskLevel: 'low',
      publishDecision: 'auto_publish',
    });

    const service = new InProcessDocumentAgentService();
    const html = await service.generateDocument('Title', 'Prompt', [
      { name: 'Format', content: 'Use HTML' },
    ]);

    expect(html).toBe('<p>Generated</p>');
    expect(generateVerifiedDocument).toHaveBeenCalledWith({
      title: 'Title',
      text: 'Prompt',
      rules: [{ name: 'Format', content: 'Use HTML' }],
    });
  });
});

describe('LangGraphDocumentGeneratorService', () => {
  it('reports agent as always enabled', () => {
    const service = new LangGraphDocumentGeneratorService();
    expect(service.isAgentEnabled()).toBe(true);
  });
});
