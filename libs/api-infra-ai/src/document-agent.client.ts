import type { RulePromptRecord } from '@sf/api-domain';

const REQUEST_TIMEOUT_MS = 120_000;

export interface DocumentAgentConfig {
  url: string;
  secret?: string;
}

export interface DocumentAgentResponse {
  htmlFragment: string;
}

export class DocumentAgentClient {
  constructor(private readonly config: DocumentAgentConfig) {}

  async generateDocument(
    title: string,
    text: string,
    rules: RulePromptRecord[],
  ): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.secret) {
      headers['x-document-agent-secret'] = this.config.secret;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${this.config.url.replace(/\/$/, '')}/api/documents/generate`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ title, text, rules }),
          signal: controller.signal,
        },
      );

      const payload = (await response.json()) as DocumentAgentResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Document agent request failed');
      }

      if (!payload.htmlFragment?.trim()) {
        throw new Error('Document agent returned empty HTML fragment');
      }

      return payload.htmlFragment;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export function createDocumentAgentConfigFromEnv(
  env: NodeJS.ProcessEnv,
): DocumentAgentConfig | null {
  const url = env['DOCUMENT_AGENT_URL'];
  if (!url) {
    return null;
  }

  return {
    url,
    secret: env['DOCUMENT_AGENT_SECRET'],
  };
}
