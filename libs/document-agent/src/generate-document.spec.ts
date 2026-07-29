import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('./workflow/graph', () => ({
  documentAgentGraph: {
    invoke: invokeMock,
  },
}));

describe('generateVerifiedDocument', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('returns verified HTML when the graph succeeds', async () => {
    invokeMock.mockResolvedValue({
      htmlFragment: '<p>Verified</p>',
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

    const { generateVerifiedDocument } = await import('./generate-document');
    const result = await generateVerifiedDocument({
      title: 'Doc',
      text: 'Write a doc',
      rules: [],
    });

    expect(result.htmlFragment).toBe('<p>Verified</p>');
    expect(result.publishDecision).toBe('auto_publish');
  });

  it('throws when validation fails and publish is rejected', async () => {
    invokeMock.mockResolvedValue({
      htmlFragment: '<script>bad</script>',
      validationReport: {
        passed: false,
        findings: [
          {
            severity: 'error',
            code: 'SECURITY_DISALLOWED_TAG',
            category: 'security',
            message: 'Disallowed tag',
          },
        ],
        errorCount: 1,
        warningCount: 0,
      },
      retryCount: 2,
      publishDecision: 'reject',
      errorMessage: 'Document validation failed after 2 repair attempt(s)',
    });

    const { generateVerifiedDocument } = await import('./generate-document');

    await expect(
      generateVerifiedDocument({
        title: 'Doc',
        text: 'Write a doc',
        rules: [],
      }),
    ).rejects.toThrow('Document validation failed');
  });
});
