import {
  mapDocumentRow,
  mapQuizRow,
  mapRuleRow,
  type CreateRuleInput,
  type DeleteRuleInput,
  type DocumentRecordRow,
  type DocumentRepository,
  type QuizRecordRow,
  type QuizRepository,
  type RuleRecordRow,
  type RuleRepository,
  type UpdateRuleInput,
} from '@sf/api-domain';
import type { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseDocumentRepository implements DocumentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: {
    id: string;
    userId: string;
    title: string;
    description: string;
    wordCount: number;
    storagePath: string;
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
}
