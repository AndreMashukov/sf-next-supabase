import {
  mapDirectoryRow,
  mapDocumentRow,
  mapQuizRow,
  mapRuleRow,
  type CreateRuleInput,
  type DeleteRuleInput,
  type DirectoryRecordRow,
  type DirectoryRepository,
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
