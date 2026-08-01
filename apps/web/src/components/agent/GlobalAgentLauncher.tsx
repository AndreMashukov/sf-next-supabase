'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot } from 'lucide-react';
import { AgentPanel } from '@/components/agent/AgentPanel';

export function GlobalAgentLauncher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

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
          variant="overlay"
          defaultExpanded
          onClose={() => setOpen(false)}
          onMutated={handleMutated}
        />
      ) : null}
    </>
  );
}
