'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bot } from 'lucide-react';
import { AgentPanel } from '@/components/agent/AgentPanel';
import { useUiStore } from '@/providers/ui-store-provider';

function directoryIdFromPathname(pathname: string | null): string | undefined {
  if (!pathname) {
    return undefined;
  }

  const match = pathname.match(/^\/directories\/([0-9a-f-]{36})(?:\/|$)/i);
  return match?.[1];
}

export function GlobalAgentLauncher() {
  const router = useRouter();
  const pathname = usePathname();
  const agentOpen = useUiStore((state) => state.agentOpen);
  const openAgent = useUiStore((state) => state.openAgent);
  const closeAgent = useUiStore((state) => state.closeAgent);
  const directoryId = useMemo(() => directoryIdFromPathname(pathname), [pathname]);

  const handleMutated = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <>
      <button
        type="button"
        className="agent-fab"
        onClick={openAgent}
        aria-label="Open workspace agent"
      >
        <Bot size={22} />
      </button>

      {agentOpen ? (
        <AgentPanel
          scope="workspace"
          directoryId={directoryId}
          variant="overlay"
          defaultExpanded
          onClose={closeAgent}
          onMutated={handleMutated}
        />
      ) : null}
    </>
  );
}
