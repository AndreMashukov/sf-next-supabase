import {
  mapAgentConversationMemoryRow,
  mapAgentThreadRow,
  mapDirectoryRow,
  mapDocumentRow,
  mapGenerationJobRow,
  mapQuizRow,
  mapRuleRow,
  type AgentChunkSourceType,
  type AgentConversationMemoryRecordRow,
  type AgentKnowledgeChunkInput,
  type AgentKnowledgeMatch,
  type AgentMemoryMatch,
  type AgentMemoryRepository,
  type AgentThreadRecordRow,
  type AgentThreadRepository,
  type CreateRuleInput,
  type DeleteRuleInput,
  type DirectoryRecordRow,
  type DirectoryRepository,
  type DocumentRecordRow,
  type DocumentRepository,
  type GenerationJobRecordRow,
  type GenerationJobRepository,
  type QuizRecordRow,
  type QuizRepository,
  type RuleRecordRow,
  type RuleRepository,
  type UpdateRuleInput,
  type VectorIndexRepository,
} from '@sf/api-domain';
import type { GenerationJobResult } from '@sf/shared-types';
import type { SupabaseClient } from '@supabase/supabase-js';

const COMPLETED_JOB_TTL_HOURS = 24;
const FAILED_JOB_TTL_DAYS = 7;
const DEFAULT_EXPIRED_DELETE_LIMIT = 100;

function buildCompletedExpiresAt(): string {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + COMPLETED_JOB_TTL_HOURS);
  return expiresAt.toISOString();
}

function buildFailedExpiresAt(): string {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + FAILED_JOB_TTL_DAYS);
  return expiresAt.toISOString();
}

export class SupabaseGenerationJobRepository implements GenerationJobRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createPending(input: {
    userId: string;
    kind: 'document' | 'quiz';
    input: Record<string, unknown>;
  }) {
    const { data, error } = await this.client
      .from('generation_jobs')
      .insert({
        user_id: input.userId,
        kind: input.kind,
        status: 'pending',
        input: input.input,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create generation job');
    }

    return mapGenerationJobRow(data as GenerationJobRecordRow);
  }

  async markCompleted(jobId: string, userId: string, result: GenerationJobResult) {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('generation_jobs')
      .update({
        status: 'completed',
        result,
        error_message: null,
        completed_at: now,
        expires_at: buildCompletedExpiresAt(),
      })
      .eq('id', jobId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to mark generation job completed');
    }

    return mapGenerationJobRow(data as GenerationJobRecordRow);
  }

  async markFailed(jobId: string, userId: string, errorMessage: string) {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('generation_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: now,
        expires_at: buildFailedExpiresAt(),
      })
      .eq('id', jobId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to mark generation job failed');
    }

    return mapGenerationJobRow(data as GenerationJobRecordRow);
  }

  async deleteExpired(limit = DEFAULT_EXPIRED_DELETE_LIMIT) {
    const { data, error } = await this.client
      .from('generation_jobs')
      .delete()
      .in('status', ['completed', 'failed'])
      .not('expires_at', 'is', null)
      .lte('expires_at', new Date().toISOString())
      .select('id')
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data?.length ?? 0;
  }
}

export class SupabaseDocumentRepository implements DocumentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: {
    id: string;
    userId: string;
    title: string;
    description: string;
    wordCount: number;
    storagePath: string;
    directoryId?: string;
    appliedRuleIds: string[];
  }) {
    const { data, error } = await this.client
      .from('documents')
      .insert({
        id: input.id,
        user_id: input.userId,
        title: input.title,
        description: input.description,
        word_count: input.wordCount,
        storage_path: input.storagePath,
        directory_id: input.directoryId ?? null,
        applied_rule_ids: input.appliedRuleIds,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create document record');
    }

    return mapDocumentRow(data as DocumentRecordRow);
  }

  async findByIdForUser(documentId: string, userId: string) {
    const { data, error } = await this.client
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return mapDocumentRow(data as DocumentRecordRow);
  }

  async findByIdsForUser(userId: string, documentIds: string[]) {
    if (documentIds.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .in('id', documentIds);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => mapDocumentRow(row as DocumentRecordRow));
  }

  async updateDirectoryId(documentId: string, userId: string, directoryId: string | null) {
    const { data, error } = await this.client
      .from('documents')
      .update({ directory_id: directoryId })
      .eq('id', documentId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Document not found');
    }

    return mapDocumentRow(data as DocumentRecordRow);
  }

  async update(input: {
    userId: string;
    documentId: string;
    title?: string;
    description?: string;
    wordCount?: number;
  }) {
    const updates: {
      title?: string;
      description?: string;
      word_count?: number;
    } = {};

    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.wordCount !== undefined) updates.word_count = input.wordCount;

    const { data, error } = await this.client
      .from('documents')
      .update(updates)
      .eq('id', input.documentId)
      .eq('user_id', input.userId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Document not found');
    }

    return mapDocumentRow(data as DocumentRecordRow);
  }

  async listByDirectoryIds(userId: string, directoryIds: string[]) {
    if (directoryIds.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .in('directory_id', directoryIds);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => mapDocumentRow(row as DocumentRecordRow));
  }

  async listForUser(userId: string) {
    const { data, error } = await this.client
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => mapDocumentRow(row as DocumentRecordRow));
  }

  async deleteByIds(userId: string, documentIds: string[]) {
    if (documentIds.length === 0) {
      return 0;
    }

    const { error, count } = await this.client
      .from('documents')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .in('id', documentIds);

    if (error) {
      throw new Error(error.message);
    }

    return count ?? 0;
  }
}

export class SupabaseRuleRepository implements RuleRepository {
  constructor(private readonly client: SupabaseClient) {}

  async verifyOwnership(userId: string, ruleIds: string[]): Promise<void> {
    if (ruleIds.length === 0) {
      return;
    }

    const { data, error } = await this.client
      .from('rules')
      .select('id')
      .eq('user_id', userId)
      .in('id', ruleIds);

    if (error) {
      throw new Error(error.message);
    }

    const foundIds = new Set((data ?? []).map((row) => row.id));
    const missing = ruleIds.filter((id) => !foundIds.has(id));

    if (missing.length > 0) {
      throw new Error('One or more selected rules were not found');
    }
  }

  async fetchByIds(userId: string, ruleIds: string[]) {
    if (ruleIds.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from('rules')
      .select('id, name, content')
      .eq('user_id', userId)
      .in('id', ruleIds);

    if (error) {
      throw new Error(error.message);
    }

    const byId = new Map((data ?? []).map((row) => [row.id, row]));

    return ruleIds
      .map((id) => byId.get(id))
      .filter((row): row is { id: string; name: string; content: string } => Boolean(row))
      .map((row) => ({ name: row.name, content: row.content }));
  }

  async findByIdForUser(ruleId: string, userId: string) {
    const { data, error } = await this.client
      .from('rules')
      .select('*')
      .eq('id', ruleId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return mapRuleRow(data as RuleRecordRow);
  }

  async listForUser(userId: string) {
    const { data, error } = await this.client
      .from('rules')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => mapRuleRow(row as RuleRecordRow));
  }

  async create(input: CreateRuleInput) {
    const { data, error } = await this.client
      .from('rules')
      .insert({
        user_id: input.userId,
        name: input.name,
        description: input.description,
        content: input.content,
        is_default: input.isDefault,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create rule');
    }

    return mapRuleRow(data as RuleRecordRow);
  }

  async update(input: UpdateRuleInput) {
    const updates: {
      name?: string;
      description?: string;
      content?: string;
      is_default?: boolean;
    } = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.content !== undefined) updates.content = input.content;
    if (input.isDefault !== undefined) updates.is_default = input.isDefault;

    const { data, error } = await this.client
      .from('rules')
      .update(updates)
      .eq('id', input.ruleId)
      .eq('user_id', input.userId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Rule not found');
    }

    return mapRuleRow(data as RuleRecordRow);
  }

  async delete(input: DeleteRuleInput): Promise<boolean> {
    const { error, count } = await this.client
      .from('rules')
      .delete({ count: 'exact' })
      .eq('id', input.ruleId)
      .eq('user_id', input.userId);

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(count);
  }
}

export class SupabaseQuizRepository implements QuizRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: {
    userId: string;
    documentId: string;
    title: string;
    questions: QuizRecordRow['questions'];
  }) {
    const { data, error } = await this.client
      .from('quizzes')
      .insert({
        user_id: input.userId,
        document_id: input.documentId,
        title: input.title,
        questions: input.questions,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to save quiz');
    }

    return mapQuizRow(data as QuizRecordRow);
  }

  async findByIdForUser(quizId: string, userId: string) {
    const { data, error } = await this.client
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return mapQuizRow(data as QuizRecordRow);
  }

  async listByDocumentIds(userId: string, documentIds: string[]) {
    if (documentIds.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from('quizzes')
      .select('*')
      .eq('user_id', userId)
      .in('document_id', documentIds);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => mapQuizRow(row as QuizRecordRow));
  }

  async listForUser(userId: string) {
    const { data, error } = await this.client
      .from('quizzes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => mapQuizRow(row as QuizRecordRow));
  }

  async update(input: {
    userId: string;
    quizId: string;
    title?: string;
    questions?: QuizRecordRow['questions'];
  }) {
    const updates: {
      title?: string;
      questions?: QuizRecordRow['questions'];
    } = {};

    if (input.title !== undefined) updates.title = input.title;
    if (input.questions !== undefined) updates.questions = input.questions;

    const { data, error } = await this.client
      .from('quizzes')
      .update(updates)
      .eq('id', input.quizId)
      .eq('user_id', input.userId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Quiz not found');
    }

    return mapQuizRow(data as QuizRecordRow);
  }

  async deleteByIds(userId: string, quizIds: string[]) {
    if (quizIds.length === 0) {
      return 0;
    }

    const { error, count } = await this.client
      .from('quizzes')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .in('id', quizIds);

    if (error) {
      throw new Error(error.message);
    }

    return count ?? 0;
  }
}

export class SupabaseDirectoryRepository implements DirectoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByIdForUser(directoryId: string, userId: string) {
    const { data, error } = await this.client
      .from('directories')
      .select('*')
      .eq('id', directoryId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return mapDirectoryRow(data as DirectoryRecordRow);
  }

  async listForUser(userId: string) {
    const { data, error } = await this.client
      .from('directories')
      .select('*')
      .eq('user_id', userId)
      .order('path', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => mapDirectoryRow(row as DirectoryRecordRow));
  }

  async listRuleIdsByDirectoryIds(directoryIds: string[]) {
    const result = new Map<string, string[]>();

    if (directoryIds.length === 0) {
      return result;
    }

    const { data, error } = await this.client
      .from('directory_rules')
      .select('directory_id, rule_id')
      .in('directory_id', directoryIds);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      const existing = result.get(row.directory_id) ?? [];
      existing.push(row.rule_id);
      result.set(row.directory_id, existing);
    }

    return result;
  }

  async countAttachedRules(ruleId: string) {
    const { count, error } = await this.client
      .from('directory_rules')
      .select('*', { count: 'exact', head: true })
      .eq('rule_id', ruleId);

    if (error) {
      throw new Error(error.message);
    }

    return count ?? 0;
  }

  async create(input: {
    userId: string;
    name: string;
    parentId?: string;
    description: string;
    path: string;
    level: number;
    color: string;
    icon: string;
  }) {
    const { data, error } = await this.client
      .from('directories')
      .insert({
        user_id: input.userId,
        parent_id: input.parentId ?? null,
        name: input.name,
        description: input.description,
        path: input.path,
        level: input.level,
        color: input.color,
        icon: input.icon,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create directory');
    }

    return mapDirectoryRow(data as DirectoryRecordRow);
  }

  async update(input: {
    userId: string;
    directoryId: string;
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    parentId?: string | null;
    path?: string;
    level?: number;
  }) {
    const updates: {
      name?: string;
      description?: string;
      color?: string;
      icon?: string;
      parent_id?: string | null;
      path?: string;
      level?: number;
    } = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.color !== undefined) updates.color = input.color;
    if (input.icon !== undefined) updates.icon = input.icon;
    if (input.parentId !== undefined) updates.parent_id = input.parentId;
    if (input.path !== undefined) updates.path = input.path;
    if (input.level !== undefined) updates.level = input.level;

    const { data, error } = await this.client
      .from('directories')
      .update(updates)
      .eq('id', input.directoryId)
      .eq('user_id', input.userId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Directory not found');
    }

    return mapDirectoryRow(data as DirectoryRecordRow);
  }

  async listDescendantIds(userId: string, directoryId: string) {
    const directory = await this.findByIdForUser(directoryId, userId);

    if (!directory) {
      throw new Error('Directory not found');
    }

    const { data, error } = await this.client
      .from('directories')
      .select('id, path')
      .eq('user_id', userId)
      .like('path', `${directory.path}/%`);

    if (error) {
      throw new Error(error.message);
    }

    return [directoryId, ...(data ?? []).map((row) => row.id)];
  }

  async deleteByIds(userId: string, directoryIds: string[]) {
    if (directoryIds.length === 0) {
      return 0;
    }

    const { error, count } = await this.client
      .from('directories')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .in('id', directoryIds);

    if (error) {
      throw new Error(error.message);
    }

    return count ?? 0;
  }

  async attachRule(directoryId: string, ruleId: string) {
    const { error } = await this.client.from('directory_rules').insert({
      directory_id: directoryId,
      rule_id: ruleId,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async detachRule(directoryId: string, ruleId: string) {
    const { error, count } = await this.client
      .from('directory_rules')
      .delete({ count: 'exact' })
      .eq('directory_id', directoryId)
      .eq('rule_id', ruleId);

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(count);
  }
}

interface AgentKnowledgeChunkRow {
  id: string;
  source_type: string;
  source_title: string;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
}

export class SupabaseVectorIndexRepository implements VectorIndexRepository {
  constructor(private readonly client: SupabaseClient) {}

  async replaceSourceChunks(input: {
    userId: string;
    sourceType: AgentChunkSourceType;
    sourceId: string;
    chunks: AgentKnowledgeChunkInput[];
  }) {
    await this.deleteBySource(input.userId, input.sourceType, input.sourceId);

    if (input.chunks.length === 0) {
      return;
    }

    const rows = input.chunks.map((chunk) => ({
      user_id: chunk.userId,
      directory_id: chunk.directoryId,
      document_id: chunk.documentId ?? null,
      quiz_id: chunk.quizId ?? null,
      source_type: chunk.sourceType,
      source_title: chunk.sourceTitle,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      content_hash: chunk.contentHash,
      metadata: chunk.metadata ?? {},
      embedding: chunk.embedding,
    }));

    const { error } = await this.client.from('agent_knowledge_chunks').insert(rows);

    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteBySource(userId: string, sourceType: AgentChunkSourceType, sourceId: string) {
    let query = this.client.from('agent_knowledge_chunks').delete().eq('user_id', userId);

    if (sourceType === 'directory') {
      query = query.eq('directory_id', sourceId).eq('source_type', 'directory');
    } else if (sourceType === 'document') {
      query = query.eq('document_id', sourceId);
    } else {
      query = query.eq('quiz_id', sourceId);
    }

    const { error } = await query;

    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteByDocumentIds(userId: string, documentIds: string[]) {
    if (documentIds.length === 0) {
      return;
    }

    const { error } = await this.client
      .from('agent_knowledge_chunks')
      .delete()
      .eq('user_id', userId)
      .in('document_id', documentIds);

    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteByDirectoryIds(userId: string, directoryIds: string[]) {
    if (directoryIds.length === 0) {
      return;
    }

    const { error } = await this.client
      .from('agent_knowledge_chunks')
      .delete()
      .eq('user_id', userId)
      .in('directory_id', directoryIds);

    if (error) {
      throw new Error(error.message);
    }
  }

  async matchChunks(input: {
    userId: string;
    directoryIds: string[];
    queryEmbedding: number[];
    matchCount?: number;
  }): Promise<AgentKnowledgeMatch[]> {
    const { data, error } = await this.client.rpc('match_agent_chunks', {
      p_user_id: input.userId,
      p_directory_ids: input.directoryIds,
      p_query_embedding: input.queryEmbedding,
      p_match_count: input.matchCount ?? 8,
    });

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as AgentKnowledgeChunkRow[]).map((row) => ({
      id: row.id,
      sourceType: row.source_type as AgentChunkSourceType,
      sourceTitle: row.source_title,
      content: row.content,
      metadata: row.metadata ?? {},
      similarity: row.similarity,
    }));
  }
}

interface AgentMemoryMatchRow {
  id: string;
  thread_id: string | null;
  memory_type: string;
  content: string;
  priority: number;
  metadata: Record<string, unknown> | null;
  similarity: number;
}

export class SupabaseAgentThreadRepository implements AgentThreadRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByIdForUser(threadId: string, userId: string) {
    const { data, error } = await this.client
      .from('agent_threads')
      .select('*')
      .eq('id', threadId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return mapAgentThreadRow(data as AgentThreadRecordRow);
  }

  async create(input: {
    userId: string;
    scope: 'workspace' | 'directory';
    directoryId?: string | null;
    title?: string;
  }) {
    const { data, error } = await this.client
      .from('agent_threads')
      .insert({
        user_id: input.userId,
        scope: input.scope,
        directory_id: input.directoryId ?? null,
        title: input.title ?? '',
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create agent thread');
    }

    return mapAgentThreadRow(data as AgentThreadRecordRow);
  }

  async touch(threadId: string, userId: string, input?: { title?: string }) {
    const updates: { last_message_at: string; title?: string } = {
      last_message_at: new Date().toISOString(),
    };

    if (input?.title !== undefined) {
      updates.title = input.title;
    }

    const { data, error } = await this.client
      .from('agent_threads')
      .update(updates)
      .eq('id', threadId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Agent thread not found');
    }

    return mapAgentThreadRow(data as AgentThreadRecordRow);
  }
}

export class SupabaseAgentMemoryRepository implements AgentMemoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: {
    userId: string;
    threadId?: string | null;
    scope: 'workspace' | 'directory';
    memoryType: import('@sf/api-domain').AgentMemoryType;
    content: string;
    priority?: number;
    metadata?: Record<string, unknown>;
    embedding: number[];
    expiresAt?: string | null;
  }) {
    const { data, error } = await this.client
      .from('agent_conversation_memories')
      .insert({
        user_id: input.userId,
        thread_id: input.threadId ?? null,
        scope: input.scope,
        memory_type: input.memoryType,
        content: input.content,
        priority: input.priority ?? 0,
        metadata: input.metadata ?? {},
        embedding: input.embedding,
        expires_at: input.expiresAt ?? null,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create agent memory');
    }

    return mapAgentConversationMemoryRow(data as AgentConversationMemoryRecordRow);
  }

  async matchMemories(input: {
    userId: string;
    queryEmbedding: number[];
    threadId?: string | null;
    scope?: 'workspace' | 'directory';
    matchCount?: number;
  }): Promise<AgentMemoryMatch[]> {
    const { data, error } = await this.client.rpc('match_agent_memories', {
      p_user_id: input.userId,
      p_query_embedding: input.queryEmbedding,
      p_thread_id: input.threadId ?? null,
      p_scope: input.scope ?? 'workspace',
      p_match_count: input.matchCount ?? 6,
    });

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as AgentMemoryMatchRow[]).map((row) => ({
      id: row.id,
      threadId: row.thread_id,
      memoryType: row.memory_type as AgentMemoryMatch['memoryType'],
      content: row.content,
      priority: row.priority,
      metadata: row.metadata ?? {},
      similarity: row.similarity,
    }));
  }
}
