export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      agent_knowledge_chunks: {
        Row: {
          id: string;
          user_id: string;
          directory_id: string | null;
          document_id: string | null;
          quiz_id: string | null;
          source_type: string;
          source_title: string;
          chunk_index: number;
          content: string;
          content_hash: string;
          metadata: Json;
          embedding: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          directory_id?: string | null;
          document_id?: string | null;
          quiz_id?: string | null;
          source_type: string;
          source_title?: string;
          chunk_index?: number;
          content: string;
          content_hash: string;
          metadata?: Json;
          embedding: string | number[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          directory_id?: string | null;
          document_id?: string | null;
          quiz_id?: string | null;
          source_type?: string;
          source_title?: string;
          chunk_index?: number;
          content?: string;
          content_hash?: string;
          metadata?: Json;
          embedding?: string | number[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      directories: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      quizzes: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      generation_jobs: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_agent_chunks: {
        Args: {
          p_user_id: string;
          p_directory_ids: string[];
          p_query_embedding: string | number[];
          p_match_count?: number;
        };
        Returns: Array<{
          id: string;
          source_type: string;
          source_title: string;
          content: string;
          metadata: Json;
          similarity: number;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
