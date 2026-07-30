import type { AuthService } from '@sf/api-domain';
import { createAuthClient, type SupabaseConfig } from './supabase-client';

export class SupabaseAuthService implements AuthService {
  constructor(private readonly config: SupabaseConfig) {}

  async getUserIdFromBearerToken(token: string): Promise<string | null> {
    const client = createAuthClient(this.config, token);
    const {
      data: { user },
      error,
    } = await client.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user.id;
  }
}
