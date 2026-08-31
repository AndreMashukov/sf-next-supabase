'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';

const USER_OWNED_NAV_TABLES = ['documents', 'directories', 'quizzes', 'rules'] as const;
const REFRESH_DEBOUNCE_MS = 150;

export function useNavigationRealtime() {
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function scheduleRefresh() {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        router.refresh();
      }, REFRESH_DEBOUNCE_MS);
    }

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
          scheduleRefresh,
        );
      }

      nextChannel = nextChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'directory_rules',
        },
        scheduleRefresh,
      );

      channel = nextChannel.subscribe();
    }

    void subscribe();

    return () => {
      cancelled = true;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [router]);
}
