'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, Maximize2, Minimize2, Send, Trash2, X } from 'lucide-react';
import type {
  AgentActionResult,
  AgentMessageResponse,
  AgentProposedDelete,
  AgentScope,
} from '@sf/shared-types';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import {
  deleteDirectory,
  deleteDocument,
  deleteQuiz,
  deleteRule,
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
      } else if (proposal.targetType === 'quiz') {
        await deleteQuiz(proposal.targetId);
      } else {
        await deleteRule(proposal.targetId);
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

const EMPTY_STATE_PROMPTS: Record<AgentScope, string[]> = {
  workspace: [
    'List all my directories and unfiled documents',
    'Create a rule for concise summaries and attach it to my Research folder',
    'Generate a quiz from my latest document',
  ],
  directory: [
    'Summarize the sources in this folder',
    'Create a subfolder called Research',
    'Generate a quiz from the latest document',
  ],
};

const GLOBAL_AGENT_THREAD_STORAGE_KEY = 'sf-global-agent-thread-id';
const GLOBAL_AGENT_SESSION_STORAGE_KEY = 'sf-global-agent-session';

type StoredAgentSession = {
  threadId?: string;
  messages: ChatMessage[];
};

function readStoredSession(scope: AgentScope): StoredAgentSession {
  if (scope !== 'workspace' || typeof window === 'undefined') {
    return { messages: [] };
  }

  try {
    const storedSession = window.sessionStorage.getItem(GLOBAL_AGENT_SESSION_STORAGE_KEY);
    if (storedSession) {
      const parsed = JSON.parse(storedSession) as StoredAgentSession;
      if (Array.isArray(parsed.messages)) {
        return {
          threadId: parsed.threadId,
          messages: parsed.messages.filter(
            (message) =>
              typeof message === 'object' &&
              message !== null &&
              typeof message.id === 'string' &&
              (message.role === 'user' || message.role === 'assistant') &&
              typeof message.content === 'string',
          ),
        };
      }
    }

    const legacyThreadId = window.sessionStorage.getItem(GLOBAL_AGENT_THREAD_STORAGE_KEY);
    return {
      threadId: legacyThreadId && legacyThreadId.trim().length > 0 ? legacyThreadId : undefined,
      messages: [],
    };
  } catch {
    return { messages: [] };
  }
}

function writeStoredSession(scope: AgentScope, session: StoredAgentSession): void {
  if (scope !== 'workspace' || typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(GLOBAL_AGENT_SESSION_STORAGE_KEY, JSON.stringify(session));
    if (session.threadId) {
      window.sessionStorage.setItem(GLOBAL_AGENT_THREAD_STORAGE_KEY, session.threadId);
    } else {
      window.sessionStorage.removeItem(GLOBAL_AGENT_THREAD_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

export function AgentPanel({
  scope = 'workspace',
  directoryId,
  onMutated,
  defaultExpanded = false,
  onClose,
  variant = 'embedded',
}: {
  scope?: AgentScope;
  directoryId?: string;
  onMutated?: () => void;
  defaultExpanded?: boolean;
  onClose?: () => void;
  variant?: 'embedded' | 'overlay';
}) {
  const storedSession = useMemo(() => readStoredSession(scope), [scope]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => storedSession.messages);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState<string | undefined>(() => storedSession.threadId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || variant === 'overlay');
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isOverlay = variant === 'overlay' || isExpanded;
  const subtitle =
    scope === 'workspace'
      ? 'Search, create, update, and organize content across your workspace.'
      : 'Search, create, update, and organize content in this folder.';

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, loading]);

  useEffect(() => {
    writeStoredSession(scope, { threadId, messages });
  }, [scope, threadId, messages]);

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
    if (!isOverlay) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (variant === 'overlay') {
          onClose?.();
        } else {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOverlay, onClose, variant]);

  const expandedStyle = useMemo(() => {
    if (!isOverlay) {
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
  }, [isOverlay, isMobile, sidebarCollapsed]);

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
        scope,
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

      if (response.executedActions.length > 0 || response.proposedDeletes.length > 0) {
        onMutated?.();
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Agent request failed');
    } finally {
      setLoading(false);
    }
  }, [directoryId, input, loading, onMutated, scope, threadId]);

  const handleClose = () => {
    if (variant === 'overlay') {
      onClose?.();
      return;
    }
    setIsExpanded(false);
  };

  return (
    <>
      {isOverlay ? (
        <div
          className="agent-panel-backdrop"
          role="presentation"
          onClick={handleClose}
        />
      ) : null}

      <section
        className={cn('agent-panel', isOverlay && 'is-expanded')}
        style={expandedStyle}
        aria-label={scope === 'workspace' ? 'Workspace agent' : 'Directory agent'}
      >
        <div className="agent-panel-toolbar">
          <div className="agent-panel-title">
            <Bot size={18} className="agent-panel-icon" />
            <div>
              <h2>Agent</h2>
              <p className="muted">{subtitle}</p>
            </div>
          </div>
          <div className="agent-panel-toolbar-actions">
            {variant === 'embedded' ? (
              <button
                type="button"
                className="agent-expand-button"
                onClick={() => setIsExpanded((current) => !current)}
                aria-label={isExpanded ? 'Exit expanded agent chat' : 'Expand agent chat'}
                aria-expanded={isExpanded}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            ) : (
              <button
                type="button"
                className="agent-expand-button"
                onClick={handleClose}
                aria-label="Close agent chat"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="agent-chat-scroll">
          {messages.length === 0 && !loading ? (
            <div className="agent-empty-state">
              <p className="muted">Try prompts like:</p>
              <ul>
                {EMPTY_STATE_PROMPTS[scope].map((prompt) => (
                  <li key={prompt}>{prompt}</li>
                ))}
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
