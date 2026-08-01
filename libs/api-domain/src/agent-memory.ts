export interface AgentThread {
  id: string;
  userId: string;
  scope: 'workspace' | 'directory';
  directoryId: string | null;
  title: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export type AgentMemoryType = 'explicit' | 'preference' | 'fact' | 'entity' | 'instruction';

export interface AgentConversationMemory {
  id: string;
  userId: string;
  threadId: string | null;
  scope: 'workspace' | 'directory';
  memoryType: AgentMemoryType;
  content: string;
  priority: number;
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMemoryMatch {
  id: string;
  threadId: string | null;
  memoryType: AgentMemoryType;
  content: string;
  priority: number;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface AgentThreadRepository {
  findByIdForUser(threadId: string, userId: string): Promise<AgentThread | null>;

  create(input: {
    userId: string;
    scope: 'workspace' | 'directory';
    directoryId?: string | null;
    title?: string;
  }): Promise<AgentThread>;

  touch(threadId: string, userId: string, input?: { title?: string }): Promise<AgentThread>;
}

export interface AgentMemoryRepository {
  create(input: {
    userId: string;
    threadId?: string | null;
    scope: 'workspace' | 'directory';
    memoryType: AgentMemoryType;
    content: string;
    priority?: number;
    metadata?: Record<string, unknown>;
    embedding: number[];
    expiresAt?: string | null;
  }): Promise<AgentConversationMemory>;

  matchMemories(input: {
    userId: string;
    queryEmbedding: number[];
    threadId?: string | null;
    scope?: 'workspace' | 'directory';
    matchCount?: number;
  }): Promise<AgentMemoryMatch[]>;
}

export interface AgentThreadRecordRow {
  id: string;
  user_id: string;
  scope: string;
  directory_id: string | null;
  title: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface AgentConversationMemoryRecordRow {
  id: string;
  user_id: string;
  thread_id: string | null;
  scope: string;
  memory_type: string;
  content: string;
  priority: number;
  metadata: Record<string, unknown> | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function mapAgentThreadRow(row: AgentThreadRecordRow): AgentThread {
  return {
    id: row.id,
    userId: row.user_id,
    scope: row.scope as AgentThread['scope'],
    directoryId: row.directory_id,
    title: row.title,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAgentConversationMemoryRow(
  row: AgentConversationMemoryRecordRow,
): AgentConversationMemory {
  return {
    id: row.id,
    userId: row.user_id,
    threadId: row.thread_id,
    scope: row.scope as AgentConversationMemory['scope'],
    memoryType: row.memory_type as AgentMemoryType,
    content: row.content,
    priority: row.priority,
    metadata: row.metadata ?? {},
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
