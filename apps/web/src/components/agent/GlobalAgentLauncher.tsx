'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bot } from 'lucide-react';
import { AgentPanel } from '@/components/agent/AgentPanel';

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
  const [open, setOpen] = useState(false);
  const directoryId = useMemo(() => directoryIdFromPathname(pathname), [pathname]);

  const handleMutated = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <>
      <button
        type="button"
        className="agent-fab"
        onClick={() => setOpen(true)}
        aria-label="Open workspace agent"
      >
        <Bot size={22} />
      </button>

      {open ? (
        <AgentPanel
          scope="workspace"
          directoryId={directoryId}
          variant="overlay"
          defaultExpanded
          onClose={() => setOpen(false)}
          onMutated={handleMutated}
        />
      ) : null}
    </>
  );
}
