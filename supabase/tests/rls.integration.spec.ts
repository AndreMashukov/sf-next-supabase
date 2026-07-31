import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const shouldRun = Boolean(supabaseUrl && serviceRoleKey);

describe.skipIf(!shouldRun)('Supabase RLS integration', () => {
  it('prevents anon clients from reading documents without auth', async () => {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(anonKey).toBeTruthy();

    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing Supabase test configuration');
    }

    const client = createClient(supabaseUrl, anonKey);
    const { data, error } = await client.from('documents').select('*');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('allows service role to inspect schema-backed tables', async () => {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase test configuration');
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await admin.from('documents').select('id').limit(1);

    expect(error).toBeNull();
  });

  it('prevents anon clients from reading directories without auth', async () => {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(anonKey).toBeTruthy();

    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing Supabase test configuration');
    }

    const client = createClient(supabaseUrl, anonKey);
    const { data, error } = await client.from('directories').select('*');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('prevents anon clients from reading generation jobs without auth', async () => {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(anonKey).toBeTruthy();

    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing Supabase test configuration');
    }

    const client = createClient(supabaseUrl, anonKey);
    const { data, error } = await client.from('generation_jobs').select('*');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('prevents anon clients from reading agent knowledge chunks without auth', async () => {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(anonKey).toBeTruthy();

    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing Supabase test configuration');
    }

    const client = createClient(supabaseUrl, anonKey);
    const { data, error } = await client.from('agent_knowledge_chunks').select('*');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
