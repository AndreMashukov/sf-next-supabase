import { tool } from '@langchain/core/tools';
import * as z from 'zod';
import type { StructuredToolInterface } from '@langchain/core/tools';
import {
  assertDirectoryInScope,
  assertDocumentInScope,
  assertQuizInScope,
  assertRuleInScope,
  isDirectoryInScope,
  resolveDefaultDirectoryId,
  resolveDefaultParentId,
  type DirectoryAgentRuntimeContext,
} from './context';

function scopeLabel(context: DirectoryAgentRuntimeContext): string {
  return context.scope === 'workspace' ? 'workspace' : 'folder subtree';
}

export function createDirectoryAgentTools(context: DirectoryAgentRuntimeContext): StructuredToolInterface[] {
  return [
    tool(
      async ({ query }) => {
        const [embedding] = await context.embeddingService.embedTexts([query]);
        const matches = await context.vectorIndexRepository.matchChunks({
          userId: context.userId,
          directoryIds: context.directoryIds,
          queryEmbedding: embedding ?? [],
          matchCount: 8,
        });

        context.executedActions.push({
          kind: 'search_knowledge',
          summary:
            matches.length === 0
              ? `Searched your ${scopeLabel(context)}`
              : matches.length === 1
                ? `Found related content in your ${scopeLabel(context)}`
                : `Found ${matches.length} related items in your ${scopeLabel(context)}`,
        });

        if (matches.length === 0) {
          return `No relevant knowledge found in this ${scopeLabel(context)}.`;
        }

        return matches
          .map(
            (match, index) =>
              `[${index + 1}] ${match.sourceType}: ${match.sourceTitle} (score ${match.similarity.toFixed(3)})\n${match.content}`,
          )
          .join('\n\n');
      },
      {
        name: 'search_knowledge',
        description:
          'Search indexed workspace knowledge using semantic retrieval over documents, quizzes, directories, and rules.',
        schema: z.object({
          query: z.string().describe('Natural language search query'),
        }),
      },
    ),
    tool(
      async () => {
        const directories = await context.directoryRepository.listForUser(context.userId);
        const scoped =
          context.scope === 'workspace'
            ? directories
            : directories.filter((directory) => context.directoryIds.includes(directory.id));
        return JSON.stringify(
          scoped.map((directory) => ({
            id: directory.id,
            name: directory.name,
            parentId: directory.parentId,
            path: directory.path,
            description: directory.description,
          })),
        );
      },
      {
        name: 'list_directories',
        description: 'List directories in the current scope.',
        schema: z.object({}),
      },
    ),
    tool(
      async () => {
        const documents =
          context.scope === 'workspace'
            ? await context.documentRepository.listForUser(context.userId)
            : await context.documentRepository.listByDirectoryIds(context.userId, context.directoryIds);
        return JSON.stringify(
          documents.map((document) => ({
            id: document.id,
            title: document.title,
            description: document.description,
            directoryId: document.directoryId,
          })),
        );
      },
      {
        name: 'list_documents',
        description: 'List documents in the current scope, including unfiled documents in workspace mode.',
        schema: z.object({}),
      },
    ),
    tool(
      async () => {
        const quizzes =
          context.scope === 'workspace'
            ? await context.quizRepository.listForUser(context.userId)
            : await context.quizRepository.listByDocumentIds(
                context.userId,
                (
                  await context.documentRepository.listByDirectoryIds(context.userId, context.directoryIds)
                ).map((document) => document.id),
              );
        return JSON.stringify(
          quizzes.map((quiz) => ({
            id: quiz.id,
            title: quiz.title,
            documentId: quiz.documentId,
            questionCount: quiz.questions.length,
          })),
        );
      },
      {
        name: 'list_quizzes',
        description: 'List quizzes in the current scope.',
        schema: z.object({}),
      },
    ),
    tool(
      async () => {
        const rules = await context.ruleRepository.listForUser(context.userId);
        return JSON.stringify(
          rules.map((rule) => ({
            id: rule.id,
            name: rule.name,
            description: rule.description,
            isDefault: rule.isDefault,
          })),
        );
      },
      {
        name: 'list_rules',
        description: 'List all rules in the workspace.',
        schema: z.object({}),
      },
    ),
    tool(
      async ({ name, parentId, description }) => {
        const resolvedParentId = resolveDefaultParentId(context, parentId);
        if (resolvedParentId) {
          assertDirectoryInScope(context, resolvedParentId);
        }
        const directory = await context.createDirectoryUseCase.execute({
          userId: context.userId,
          name,
          parentId: resolvedParentId,
          description: description ?? '',
          color: '#8b5cf6',
          icon: 'Folder',
        });
        context.executedActions.push({
          kind: 'create_directory',
          summary: `Created directory "${directory.name}"`,
          entityType: 'directory',
          entityId: directory.id,
        });
        return JSON.stringify(directory);
      },
      {
        name: 'create_directory',
        description: 'Create a directory in the current scope. Omit parentId to create a root directory.',
        schema: z.object({
          name: z.string().min(1).max(100),
          parentId: z.string().uuid().optional(),
          description: z.string().optional(),
        }),
      },
    ),
    tool(
      async ({
        folderName,
        folderDescription,
        documentTitle,
        documentText,
        quizTitle,
        questionCount,
        parentId,
        ruleIds,
      }) => {
        const resolvedParentId = resolveDefaultParentId(context, parentId);
        if (resolvedParentId) {
          assertDirectoryInScope(context, resolvedParentId);
        }
        const directory = await context.createDirectoryUseCase.execute({
          userId: context.userId,
          name: folderName,
          parentId: resolvedParentId,
          description: folderDescription ?? '',
          color: '#8b5cf6',
          icon: 'Folder',
        });
        context.executedActions.push({
          kind: 'create_directory',
          summary: `Created directory "${directory.name}"`,
          entityType: 'directory',
          entityId: directory.id,
        });

        const followUpQuiz =
          quizTitle || questionCount
            ? {
                title: quizTitle,
                questionCount: questionCount ?? 5,
              }
            : undefined;

        const job = await context.createDocumentUseCase.start({
          userId: context.userId,
          title: documentTitle,
          text: documentText,
          ruleIds: ruleIds ?? [],
          directoryId: directory.id,
          followUpQuiz,
        });
        context.executedActions.push({
          kind: 'create_document',
          summary: `Started document generation for "${documentTitle}"`,
          entityType: 'document',
          jobId: job.id,
        });
        if (followUpQuiz) {
          context.executedActions.push({
            kind: 'generate_quiz',
            summary: `Queued quiz generation for "${quizTitle ?? documentTitle}" after the document finishes`,
            entityType: 'quiz',
            jobId: job.id,
          });
        }

        return JSON.stringify({
          directory,
          documentJobId: job.id,
          documentJobStatus: job.status,
          quizQueued: Boolean(followUpQuiz),
          message:
            'Folder created and document generation started. Quiz generation will start automatically after the document completes.',
        });
      },
      {
        name: 'create_folder_with_content',
        description:
          'Create a folder, start async document generation inside it, and optionally queue quiz generation after the document completes.',
        schema: z.object({
          folderName: z.string().min(1).max(100),
          folderDescription: z.string().optional(),
          documentTitle: z.string().min(1).max(200),
          documentText: z.string().min(1).max(100_000),
          quizTitle: z.string().min(1).max(200).optional(),
          questionCount: z.number().int().min(1).max(10).optional(),
          parentId: z.string().uuid().optional(),
          ruleIds: z.array(z.string().uuid()).optional(),
        }),
      },
    ),
    tool(
      async ({ directoryId, name, description }) => {
        await assertDirectoryInScope(context, directoryId);
        const directory = await context.updateDirectoryUseCase.execute({
          userId: context.userId,
          directoryId,
          name,
          description,
        });
        context.executedActions.push({
          kind: 'update_directory',
          summary: `Updated directory "${directory.name}"`,
          entityType: 'directory',
          entityId: directory.id,
        });
        return JSON.stringify(directory);
      },
      {
        name: 'update_directory',
        description: 'Update a directory name or description within scope.',
        schema: z.object({
          directoryId: z.string().uuid(),
          name: z.string().min(1).max(100).optional(),
          description: z.string().optional(),
        }),
      },
    ),
    tool(
      async ({ directoryId, parentId }) => {
        await assertDirectoryInScope(context, directoryId);
        assertDirectoryInScope(context, parentId ?? null);
        const directory = await context.moveDirectoryUseCase.execute({
          userId: context.userId,
          directoryId,
          parentId,
        });
        context.executedActions.push({
          kind: 'move_directory',
          summary: `Moved directory "${directory.name}"`,
          entityType: 'directory',
          entityId: directory.id,
        });
        return JSON.stringify(directory);
      },
      {
        name: 'move_directory',
        description: 'Move a directory to a new parent within scope.',
        schema: z.object({
          directoryId: z.string().uuid(),
          parentId: z.string().uuid().optional(),
        }),
      },
    ),
    tool(
      async ({ title, text, directoryId, ruleIds, quizTitle, questionCount }) => {
        const targetDirectoryId = resolveDefaultDirectoryId(context, directoryId);
        if (targetDirectoryId) {
          assertDirectoryInScope(context, targetDirectoryId);
        }
        const followUpQuiz =
          quizTitle || questionCount
            ? {
                title: quizTitle,
                questionCount: questionCount ?? 5,
              }
            : undefined;
        const job = await context.createDocumentUseCase.start({
          userId: context.userId,
          title,
          text,
          ruleIds: ruleIds ?? [],
          directoryId: targetDirectoryId,
          followUpQuiz,
        });
        context.executedActions.push({
          kind: 'create_document',
          summary: `Started document generation for "${title}"`,
          entityType: 'document',
          jobId: job.id,
        });
        if (followUpQuiz) {
          context.executedActions.push({
            kind: 'generate_quiz',
            summary: `Queued quiz generation after the document finishes`,
            entityType: 'quiz',
            jobId: job.id,
          });
        }
        return JSON.stringify({
          jobId: job.id,
          status: job.status,
          quizQueued: Boolean(followUpQuiz),
        });
      },
      {
        name: 'create_document',
        description:
          'Start async AI document generation. Optionally queue quiz generation after the document completes. Omit directoryId to create an unfiled document.',
        schema: z.object({
          title: z.string().min(1).max(200),
          text: z.string().min(1).max(100_000),
          directoryId: z.string().uuid().optional(),
          ruleIds: z.array(z.string().uuid()).optional(),
          quizTitle: z.string().min(1).max(200).optional(),
          questionCount: z.number().int().min(1).max(10).optional(),
        }),
      },
    ),
    tool(
      async ({ documentId, title, description, html }) => {
        await assertDocumentInScope(context, documentId);
        const document = await context.updateDocumentUseCase.execute({
          userId: context.userId,
          documentId,
          title,
          description,
          html,
        });
        context.executedActions.push({
          kind: 'update_document',
          summary: `Updated document "${document.title}"`,
          entityType: 'document',
          entityId: document.id,
        });
        return JSON.stringify(document);
      },
      {
        name: 'update_document',
        description: 'Update document metadata or HTML content within scope.',
        schema: z.object({
          documentId: z.string().uuid(),
          title: z.string().min(1).max(200).optional(),
          description: z.string().optional(),
          html: z.string().min(1).optional(),
        }),
      },
    ),
    tool(
      async ({ documentId, directoryId }) => {
        await assertDocumentInScope(context, documentId);
        assertDirectoryInScope(context, directoryId ?? null);
        const document = await context.moveDocumentUseCase.execute({
          userId: context.userId,
          documentId,
          directoryId,
        });
        context.executedActions.push({
          kind: 'move_document',
          summary: `Moved document "${document.title}"`,
          entityType: 'document',
          entityId: document.id,
        });
        return JSON.stringify(document);
      },
      {
        name: 'move_document',
        description: 'Move a document to another folder within scope. Omit directoryId to unfile the document.',
        schema: z.object({
          documentId: z.string().uuid(),
          directoryId: z.string().uuid().optional(),
        }),
      },
    ),
    tool(
      async ({ documentId, title, questionCount }) => {
        await assertDocumentInScope(context, documentId);
        const job = await context.generateQuizUseCase.start({
          userId: context.userId,
          documentId,
          title,
          questionCount: questionCount ?? 5,
        });
        context.executedActions.push({
          kind: 'generate_quiz',
          summary: `Started quiz generation for document ${documentId}`,
          entityType: 'quiz',
          jobId: job.id,
        });
        return JSON.stringify({ jobId: job.id, status: job.status });
      },
      {
        name: 'generate_quiz',
        description: 'Start async quiz generation for a document within scope.',
        schema: z.object({
          documentId: z.string().uuid(),
          title: z.string().min(1).max(200).optional(),
          questionCount: z.number().int().min(1).max(10).optional(),
        }),
      },
    ),
    tool(
      async ({ quizId, title, questions }) => {
        await assertQuizInScope(context, quizId);
        const updatedQuiz = await context.updateQuizUseCase.execute({
          userId: context.userId,
          quizId,
          title,
          questions,
        });
        context.executedActions.push({
          kind: 'update_quiz',
          summary: `Updated quiz "${updatedQuiz.title}"`,
          entityType: 'quiz',
          entityId: updatedQuiz.id,
        });
        return JSON.stringify(updatedQuiz);
      },
      {
        name: 'update_quiz',
        description: 'Update quiz title or questions within scope.',
        schema: z.object({
          quizId: z.string().uuid(),
          title: z.string().min(1).max(200).optional(),
          questions: z
            .array(
              z.object({
                question: z.string().min(1),
                options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
                correctAnswer: z.number().int().min(0).max(3),
                explanation: z.string().min(1),
                hint: z.string().optional(),
              }),
            )
            .optional(),
        }),
      },
    ),
    tool(
      async ({ name, description, content, isDefault }) => {
        const rule = await context.createRuleUseCase.execute({
          userId: context.userId,
          name,
          description: description ?? '',
          content,
          isDefault: isDefault ?? false,
        });
        context.executedActions.push({
          kind: 'create_rule',
          summary: `Created rule "${rule.name}"`,
          entityType: 'rule',
          entityId: rule.id,
        });
        return JSON.stringify(rule);
      },
      {
        name: 'create_rule',
        description: 'Create a new rule in the workspace.',
        schema: z.object({
          name: z.string().min(1).max(100),
          description: z.string().optional(),
          content: z.string().min(1),
          isDefault: z.boolean().optional(),
        }),
      },
    ),
    tool(
      async ({ ruleId, name, description, content, isDefault }) => {
        await assertRuleInScope(context, ruleId);
        const rule = await context.updateRuleUseCase.execute({
          userId: context.userId,
          ruleId,
          name,
          description,
          content,
          isDefault,
        });
        context.executedActions.push({
          kind: 'update_rule',
          summary: `Updated rule "${rule.name}"`,
          entityType: 'rule',
          entityId: rule.id,
        });
        return JSON.stringify(rule);
      },
      {
        name: 'update_rule',
        description: 'Update an existing rule in the workspace.',
        schema: z.object({
          ruleId: z.string().uuid(),
          name: z.string().min(1).max(100).optional(),
          description: z.string().optional(),
          content: z.string().min(1).optional(),
          isDefault: z.boolean().optional(),
        }),
      },
    ),
    tool(
      async ({ directoryId, ruleId }) => {
        await assertDirectoryInScope(context, directoryId);
        await assertRuleInScope(context, ruleId);
        await context.attachRuleToDirectoryUseCase.execute({
          userId: context.userId,
          directoryId,
          ruleId,
        });
        context.executedActions.push({
          kind: 'attach_rule',
          summary: `Attached rule to directory`,
          entityType: 'rule',
          entityId: ruleId,
        });
        return 'Rule attached to directory successfully.';
      },
      {
        name: 'attach_rule_to_directory',
        description: 'Attach a rule to a directory so it applies to content in that folder.',
        schema: z.object({
          directoryId: z.string().uuid(),
          ruleId: z.string().uuid(),
        }),
      },
    ),
    tool(
      async ({ directoryId, ruleId }) => {
        await assertDirectoryInScope(context, directoryId);
        await assertRuleInScope(context, ruleId);
        await context.detachRuleFromDirectoryUseCase.execute({
          userId: context.userId,
          directoryId,
          ruleId,
        });
        context.executedActions.push({
          kind: 'detach_rule',
          summary: `Detached rule from directory`,
          entityType: 'rule',
          entityId: ruleId,
        });
        return 'Rule detached from directory successfully.';
      },
      {
        name: 'detach_rule_from_directory',
        description: 'Detach a rule from a directory.',
        schema: z.object({
          directoryId: z.string().uuid(),
          ruleId: z.string().uuid(),
        }),
      },
    ),
    tool(
      async ({ directoryId, reason }) => {
        const directory = await context.directoryRepository.findByIdForUser(directoryId, context.userId);
        if (!directory || !isDirectoryInScope(context, directory.id)) {
          throw new Error('Directory not found in scope');
        }
        context.proposedDeletes.push({
          targetType: 'directory',
          targetId: directory.id,
          label: directory.name,
          reason,
        });
        return `Delete proposal created for directory "${directory.name}". The user must confirm before deletion.`;
      },
      {
        name: 'propose_delete_directory',
        description: 'Propose deleting a directory. Does not delete until the user confirms.',
        schema: z.object({
          directoryId: z.string().uuid(),
          reason: z.string().optional(),
        }),
      },
    ),
    tool(
      async ({ documentIds, reason }) => {
        for (const documentId of documentIds) {
          const document = await assertDocumentInScope(context, documentId);
          context.proposedDeletes.push({
            targetType: 'document',
            targetId: document.id,
            label: document.title,
            reason,
          });
        }
        return `Delete proposal created for ${documentIds.length} document(s). The user must confirm before deletion.`;
      },
      {
        name: 'propose_delete_documents',
        description: 'Propose deleting one or more documents. Does not delete until the user confirms.',
        schema: z.object({
          documentIds: z.array(z.string().uuid()).min(1),
          reason: z.string().optional(),
        }),
      },
    ),
    tool(
      async ({ quizIds, reason }) => {
        for (const quizId of quizIds) {
          const quiz = await assertQuizInScope(context, quizId);
          context.proposedDeletes.push({
            targetType: 'quiz',
            targetId: quiz.id,
            label: quiz.title,
            reason,
          });
        }
        return `Delete proposal created for ${quizIds.length} quiz(zes). The user must confirm before deletion.`;
      },
      {
        name: 'propose_delete_quizzes',
        description: 'Propose deleting one or more quizzes. Does not delete until the user confirms.',
        schema: z.object({
          quizIds: z.array(z.string().uuid()).min(1),
          reason: z.string().optional(),
        }),
      },
    ),
    tool(
      async ({ ruleIds, reason }) => {
        for (const ruleId of ruleIds) {
          const rule = await assertRuleInScope(context, ruleId);
          context.proposedDeletes.push({
            targetType: 'rule',
            targetId: rule.id,
            label: rule.name,
            reason,
          });
        }
        return `Delete proposal created for ${ruleIds.length} rule(s). The user must confirm before deletion. Rules attached to directories must be detached first.`;
      },
      {
        name: 'propose_delete_rules',
        description:
          'Propose deleting one or more rules. Does not delete until the user confirms. Rules attached to directories must be detached first.',
        schema: z.object({
          ruleIds: z.array(z.string().uuid()).min(1),
          reason: z.string().optional(),
        }),
      },
    ),
  ];
}
