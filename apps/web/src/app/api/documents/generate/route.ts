import { generateVerifiedDocument, mapRulesFromRecords } from '@sf/document-agent';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(100_000),
  rules: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        content: z.string().trim().min(1),
      }),
    )
    .default([]),
});

function authorizeRequest(request: Request): boolean {
  const configuredSecret = process.env.DOCUMENT_AGENT_SECRET;
  if (!configuredSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  const providedSecret = request.headers.get('x-document-agent-secret');
  return providedSecret === configuredSecret;
}

export async function POST(request: Request) {
  if (!authorizeRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = requestSchema.parse(await request.json());
    const result = await generateVerifiedDocument({
      title: body.title,
      text: body.text,
      rules: mapRulesFromRecords(body.rules),
    });

    return NextResponse.json({
      htmlFragment: result.htmlFragment,
      validationReport: result.validationReport,
      retryCount: result.retryCount,
      riskLevel: result.riskLevel,
      publishDecision: result.publishDecision,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Document generation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
