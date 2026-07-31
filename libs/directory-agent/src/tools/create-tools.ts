import { tool } from '@langchain/core/tools';
import * as z from 'zod';
import type { StructuredToolInterface } from '@langchain/core/tools';
import {
  assertDirectoryInScope,
  assertDocumentInScope,
  assertQuizInScope,
  type DirectoryAgentRuntimeContext,
} from './context';

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
          summary: `Retrieved ${matches.length} knowledge chunks`,
        });

        if (matches.length === 0) {
          return 'No relevant knowledge found in this folder subtree.';
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
        description: 'Search indexed folder knowledge using semantic retrieval over documents, quizzes, and directories.',
        schema: z.object({
          query: z.string().describe('Natural language search query'),
        }),
      },
    ),
    tool(
      async () => {
        const directories = await context.directoryRepository.listForUser(context.userId);
        const scoped = directories.filter((directory) => context.directoryIds.includes(directory.id));
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
        description: 'List directories in the current folder subtree.',
        schema: z.object({}),
      },
    ),
    tool(
      async () => {
        const documents = await context.documentRepository.listByDirectoryIds(
          context.userId,
          context.directoryIds,
        );
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
        description: 'List documents in the current folder subtree.',
        schema: z.object({}),
      },
    ),
    tool(
      async () => {
        const documents = await context.documentRepository.listByDirectoryIds(
          context.userId,
          context.directoryIds,
        );
        const quizzes = await context.quizRepository.listByDocumentIds(
          context.userId,
          documents.map((document) => document.id),
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
        description: 'List quizzes for documents in the current folder subtree.',
        schema: z.object({}),
      },
    ),
    tool(
      async ({ name, parentId, description }) => {
        const resolvedParentId =
          parentId && context.directoryIds.includes(parentId)
            ? parentId
            : context.directoryId;
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
        description: 'Create a subdirectory inside the current folder scope.',
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
        const resolvedParentId =
          parentId && context.directoryIds.includes(parentId)
            ? parentId
            : context.directoryId;
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
          'Create a subfolder, start async document generation inside it, and optionally queue quiz generation after the document completes.',
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
        const targetDirectoryId = directoryId ?? context.directoryId;
        assertDirectoryInScope(context, targetDirectoryId);
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
          'Start async AI document generation in a folder within scope. Optionally queue quiz generation after the document completes.',
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
        description: 'Move a document to another folder within scope.',
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
        const quiz = await assertQuizInScope(context, quizId);
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
      async ({ directoryId, reason }) => {
        const directory = await context.directoryRepository.findByIdForUser(directoryId, context.userId);
        if (!directory || !context.directoryIds.includes(directory.id)) {
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
  ];
}
