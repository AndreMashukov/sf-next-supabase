'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, Maximize2, Minimize2, Send, Trash2 } from 'lucide-react';
import type { AgentActionResult, AgentMessageResponse, AgentProposedDelete } from '@sf/shared-types';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import {
  deleteDirectory,
  deleteDocument,
  deleteQuiz,
  sendAgentMessage,
} from '@/lib/api';
import { cn } from '@/lib/utils';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  executedActions?: AgentActionResult[];
  proposedDeletes?: AgentProposedDelete[];
};

const PAGE_WIDE_GAP_PX = 16;

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function DeleteProposalCard({
  proposal,
  onConfirmed,
}: {
  proposal: AgentProposedDelete;
  onConfirmed: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      if (proposal.targetType === 'directory') {
        await deleteDirectory(proposal.targetId);
      } else if (proposal.targetType === 'document') {
        await deleteDocument(proposal.targetId);
      } else {
        await deleteQuiz(proposal.targetId);
      }
      onConfirmed();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Delete failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="agent-delete-card">
      <div className="agent-delete-card-header">
        <Trash2 size={14} />
        <span>
          Delete {proposal.targetType}: {proposal.label}
        </span>
      </div>
      {proposal.reason ? <p className="muted">{proposal.reason}</p> : null}
      {error ? <div className="error">{error}</div> : null}
      <button type="button" className="button danger" disabled={loading} onClick={handleConfirm}>
        {loading ? 'Deleting...' : 'Confirm delete'}
      </button>
    </div>
  );
}

export function AgentPanel({
  directoryId,
  onMutated,
}: {
  directoryId: string;
  onMutated?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, loading]);

  useEffect(() => {
    const syncLayout = () => {
      setIsMobile(window.innerWidth < 768);
      const sidebar = document.querySelector('.sidebar');
      setSidebarCollapsed(Boolean(sidebar?.classList.contains('collapsed')));
    };

    syncLayout();
    window.addEventListener('resize', syncLayout);

    const sidebar = document.querySelector('.sidebar');
    const observer =
      sidebar instanceof Element
        ? new MutationObserver(syncLayout)
        : null;
    observer?.observe(sidebar as Element, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      window.removeEventListener('resize', syncLayout);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const expandedStyle = useMemo(() => {
    if (!isExpanded) {
      return undefined;
    }

    const sidebarWidth = sidebarCollapsed
      ? 'var(--sidebar-collapsed-width)'
      : 'var(--sidebar-width)';

    return {
      top: `calc(var(--app-bar-height) + ${PAGE_WIDE_GAP_PX}px)`,
      left: isMobile ? `${PAGE_WIDE_GAP_PX}px` : `calc(${sidebarWidth} + ${PAGE_WIDE_GAP_PX}px)`,
      right: `${PAGE_WIDE_GAP_PX}px`,
      bottom: `${PAGE_WIDE_GAP_PX}px`,
    } as const;
  }, [isExpanded, isMobile, sidebarCollapsed]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response: AgentMessageResponse = await sendAgentMessage({
        directoryId,
        message: trimmed,
        threadId,
      });

      setThreadId(response.threadId);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          content: response.reply,
          executedActions: response.executedActions,
          proposedDeletes: response.proposedDeletes,
        },
      ]);

      if (response.executedActions.length > 0) {
        onMutated?.();
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Agent request failed');
    } finally {
      setLoading(false);
    }
  }, [directoryId, input, loading, onMutated, threadId]);

  return (
    <>
      {isExpanded ? (
        <div
          className="agent-panel-backdrop"
          role="presentation"
          onClick={() => setIsExpanded(false)}
        />
      ) : null}

      <section
        className={cn('agent-panel', isExpanded && 'is-expanded')}
        style={expandedStyle}
        aria-label="Directory agent"
      >
        <div className="agent-panel-toolbar">
          <div className="agent-panel-title">
            <Bot size={18} className="agent-panel-icon" />
            <div>
              <h2>Agent</h2>
              <p className="muted">Search, create, update, and organize content in this folder.</p>
            </div>
          </div>
          <button
            type="button"
            className="agent-expand-button"
            onClick={() => setIsExpanded((current) => !current)}
            aria-label={isExpanded ? 'Exit expanded agent chat' : 'Expand agent chat'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>

        <div className="agent-chat-scroll">
          {messages.length === 0 && !loading ? (
            <div className="agent-empty-state">
              <p className="muted">Try prompts like:</p>
              <ul>
                <li>Summarize the sources in this folder</li>
                <li>Create a subfolder called Research</li>
                <li>Generate a quiz from the latest document</li>
              </ul>
            </div>
          ) : null}

          <div className="agent-chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`agent-chat-row ${message.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className={`agent-chat-bubble ${message.role}`}>
                  {message.role === 'assistant' ? (
                    <MarkdownRenderer content={message.content} />
                  ) : (
                    <p className="agent-chat-user-text">{message.content}</p>
                  )}

                  {message.executedActions && message.executedActions.length > 0 ? (
                    <div className="agent-action-chips">
                      {message.executedActions.map((action, index) => (
                        <span key={`${message.id}-action-${index}`} className="agent-action-chip">
                          {action.summary}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {message.proposedDeletes?.map((proposal) => (
                    <DeleteProposalCard
                      key={`${message.id}-${proposal.targetType}-${proposal.targetId}`}
                      proposal={proposal}
                      onConfirmed={() => onMutated?.()}
                    />
                  ))}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="agent-chat-row assistant">
                <div className="agent-chat-bubble assistant loading">
                  <Loader2 size={14} className="spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            ) : null}

            <div ref={scrollRef} />
          </div>
        </div>

        {error ? <div className="agent-chat-error error">{error}</div> : null}

        <form
          className="agent-chat-form"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask the agent to search, create, update, or organize content..."
            rows={3}
            disabled={loading}
          />
          <div className="agent-chat-form-actions">
            <button type="submit" className="button" disabled={loading || !input.trim()}>
              {loading ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
              Send
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
