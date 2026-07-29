export interface DocumentAgentRule {
  name: string;
  content: string;
}

export interface DocumentAgentResponse {
  htmlFragment: string;
  validationReport: {
    passed: boolean;
    findings: Array<{
      severity: 'error' | 'warning';
      code: string;
      category: string;
      message: string;
      pathOrSnippet?: string;
      repairHint?: string;
    }>;
    errorCount: number;
    warningCount: number;
  };
  retryCount: number;
  riskLevel: 'low' | 'medium' | 'high';
  publishDecision: 'auto_publish' | 'reject';
}

export async function generateDocumentViaAgent(
  title: string,
  text: string,
  rules: DocumentAgentRule[],
): Promise<string> {
  const agentUrl = Deno.env.get('DOCUMENT_AGENT_URL');
  if (!agentUrl) {
    throw new Error('DOCUMENT_AGENT_URL is not configured');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const secret = Deno.env.get('DOCUMENT_AGENT_SECRET');
  if (secret) {
    headers['x-document-agent-secret'] = secret;
  }

  const response = await fetch(`${agentUrl.replace(/\/$/, '')}/api/documents/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, text, rules }),
  });

  const payload = (await response.json()) as DocumentAgentResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Document agent request failed');
  }

  if (!payload.htmlFragment?.trim()) {
    throw new Error('Document agent returned empty HTML fragment');
  }

  return payload.htmlFragment;
}

export function isDocumentAgentEnabled(): boolean {
  return Boolean(Deno.env.get('DOCUMENT_AGENT_URL'));
}
