'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { NavDocument } from '@/lib/data/navigation';

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }}
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function QuizIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 4.2 1.8c-.8.8-1.7 1.2-1.7 2.7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.75" fill="currentColor" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m3 10.5 9-7 9 7M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getInitialExpandedIds(documents: NavDocument[], pathname: string): Set<string> {
  const expanded = new Set<string>();

  for (const document of documents) {
    const documentPath = `/documents/${document.id}`;
    const isDocumentActive = pathname === documentPath || pathname.startsWith(`${documentPath}/`);
    const hasActiveQuiz = document.quizzes.some((quiz) => pathname === `/quizzes/${quiz.id}`);

    if (isDocumentActive || hasActiveQuiz) {
      expanded.add(document.id);
    }
  }

  return expanded;
}

export function Sidebar({
  documents,
  userEmail,
  isOpen,
  onClose,
}: {
  documents: NavDocument[];
  userEmail: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    getInitialExpandedIds(documents, pathname),
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setExpandedIds((current) => {
      const next = new Set(current);
      for (const id of getInitialExpandedIds(documents, pathname)) {
        next.add(id);
      }
      return next;
    });
  }, [documents, pathname]);

  const isDocumentsActive = pathname === '/documents';

  function toggleDocument(documentId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(documentId)) {
        next.delete(documentId);
      } else {
        next.add(documentId);
      }
      return next;
    });
  }

  const avatarLabel = useMemo(() => {
    if (!userEmail) {
      return '?';
    }
    return userEmail.charAt(0).toUpperCase();
  }, [userEmail]);

  if (isMobile && !isOpen) {
    return null;
  }

  return (
    <>
      {isMobile && isOpen ? (
        <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />
      ) : null}
      <aside
        className={`sidebar${isOpen ? '' : ' collapsed'}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-scroll">
          <div className="sidebar-section-label">Navigation</div>
          <nav className="sidebar-nav" aria-label="Navigation">
            <Link
              href="/documents"
              className={`sidebar-nav-item${isDocumentsActive ? ' active' : ''}`}
              onClick={isMobile ? onClose : undefined}
            >
              <span className="sidebar-nav-item-icon">
                <HomeIcon />
              </span>
              {isOpen ? <span className="sidebar-nav-item-text">Documents</span> : null}
            </Link>
          </nav>

          <div className="sidebar-section-label">Directory</div>
          <nav className="sidebar-nav" aria-label="Directory">
            {documents.length === 0 ? (
              <p className="muted" style={{ padding: '0.25rem 0.625rem', margin: 0, fontSize: '0.8125rem' }}>
                {isOpen ? 'No documents yet' : '—'}
              </p>
            ) : (
              documents.map((document) => {
                const documentPath = `/documents/${document.id}`;
                const isDocumentActive = pathname === documentPath;
                const isExpanded = expandedIds.has(document.id);
                const hasQuizzes = document.quizzes.length > 0;

                return (
                  <div key={document.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
                      <button
                        type="button"
                        className={`sidebar-tree-toggle${hasQuizzes ? '' : ' hidden'}`}
                        onClick={() => toggleDocument(document.id)}
                        aria-label={isExpanded ? 'Collapse document' : 'Expand document'}
                        aria-expanded={isExpanded}
                      >
                        {hasQuizzes ? <ChevronIcon expanded={isExpanded} /> : null}
                      </button>
                      <Link
                        href={documentPath}
                        className={`sidebar-nav-item${isDocumentActive ? ' active' : ''}`}
                        style={{ flex: 1, minWidth: 0 }}
                        onClick={isMobile ? onClose : undefined}
                      >
                        <span className="sidebar-nav-item-icon">
                          <FolderIcon />
                        </span>
                        {isOpen ? (
                          <span className="sidebar-nav-item-text">{document.title}</span>
                        ) : null}
                      </Link>
                    </div>

                    {isOpen && isExpanded && hasQuizzes ? (
                      <div className="sidebar-tree-children">
                        {document.quizzes.map((quiz) => {
                          const quizPath = `/quizzes/${quiz.id}`;
                          const isQuizActive = pathname === quizPath;

                          return (
                            <Link
                              key={quiz.id}
                              href={quizPath}
                              className={`sidebar-tree-child${isQuizActive ? ' active' : ''}`}
                              onClick={isMobile ? onClose : undefined}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                                <QuizIcon />
                                {quiz.title}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </nav>
        </div>

        {userEmail ? (
          <div className="sidebar-footer">
            <div className="sidebar-avatar">{avatarLabel}</div>
            {isOpen ? (
              <>
                <div className="sidebar-profile">
                  <span className="sidebar-profile-email">{userEmail}</span>
                  <span className="sidebar-profile-label">Signed in</span>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </aside>
    </>
  );
}
