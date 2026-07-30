import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

export function createServiceClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.serviceRoleKey);
}

export function createAuthClient(config: SupabaseConfig, accessToken: string): SupabaseClient {
  return createClient(config.url, config.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
