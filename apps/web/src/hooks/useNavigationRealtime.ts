'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';

const USER_OWNED_NAV_TABLES = ['documents', 'directories', 'quizzes', 'rules'] as const;

export function useNavigationRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        return;
      }

      let nextChannel = supabase.channel(`navigation-${user.id}`);

      for (const table of USER_OWNED_NAV_TABLES) {
        nextChannel = nextChannel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            router.refresh();
          },
        );
      }

      nextChannel = nextChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'directory_rules',
        },
        () => {
          router.refresh();
        },
      );

      channel = nextChannel.subscribe();
    }

    void subscribe();

    return () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [router]);
}
