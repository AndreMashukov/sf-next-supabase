import { z } from 'zod';

export const agentMessageSchema = z.object({
  directoryId: z.string().uuid('Invalid directory ID'),
  message: z.string().trim().min(1, 'Message is required').max(10_000),
  threadId: z.string().uuid('Invalid thread ID').optional(),
});

export const agentActionKindSchema = z.enum([
  'create_directory',
  'update_directory',
  'move_directory',
  'create_document',
  'update_document',
  'move_document',
  'generate_quiz',
  'update_quiz',
  'search_knowledge',
]);

export const agentDeleteTargetSchema = z.enum(['directory', 'document', 'quiz']);

export const agentActionResultSchema = z.object({
  kind: agentActionKindSchema,
  summary: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  jobId: z.string().optional(),
});

export const agentProposedDeleteSchema = z.object({
  targetType: agentDeleteTargetSchema,
  targetId: z.string().uuid(),
  label: z.string(),
  reason: z.string().optional(),
});

export const agentMessageResponseSchema = z.object({
  reply: z.string(),
  threadId: z.string().uuid(),
  executedActions: z.array(agentActionResultSchema),
  proposedDeletes: z.array(agentProposedDeleteSchema),
});

export type AgentMessageRequest = z.input<typeof agentMessageSchema>;
export type AgentMessageInput = z.output<typeof agentMessageSchema>;
export type AgentActionKind = z.output<typeof agentActionKindSchema>;
export type AgentDeleteTarget = z.output<typeof agentDeleteTargetSchema>;
export type AgentActionResult = z.output<typeof agentActionResultSchema>;
export type AgentProposedDelete = z.output<typeof agentProposedDeleteSchema>;
export type AgentMessageResponse = z.output<typeof agentMessageResponseSchema>;
