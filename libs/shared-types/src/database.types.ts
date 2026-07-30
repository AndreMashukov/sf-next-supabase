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
      documents: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          word_count: number;
          storage_path: string;
          directory_id: string | null;
          applied_rule_ids: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          word_count?: number;
          storage_path: string;
          directory_id?: string | null;
          applied_rule_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          word_count?: number;
          storage_path?: string;
          directory_id?: string | null;
          applied_rule_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      directories: {
        Row: {
          id: string;
          user_id: string;
          parent_id: string | null;
          name: string;
          description: string;
          path: string;
          level: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          parent_id?: string | null;
          name: string;
          description?: string;
          path: string;
          level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          parent_id?: string | null;
          name?: string;
          description?: string;
          path?: string;
          level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      directory_rules: {
        Row: {
          directory_id: string;
          rule_id: string;
          created_at: string;
        };
        Insert: {
          directory_id: string;
          rule_id: string;
          created_at?: string;
        };
        Update: {
          directory_id?: string;
          rule_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      rules: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          content: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string;
          content: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string;
          content?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quizzes: {
        Row: {
          id: string;
          user_id: string;
          document_id: string;
          title: string;
          questions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id: string;
          title: string;
          questions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          document_id?: string;
          title?: string;
          questions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
