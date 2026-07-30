'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { NavDocument, NavigationTree } from '@/lib/data/navigation';
import type { DirectoryTreeNode } from '@sf/shared-types';

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

function RulesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 7h10M7 12h10M7 17h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
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

function getInitialExpandedIds(
  navigation: NavigationTree,
  pathname: string,
): Set<string> {
  const expanded = new Set<string>();

  const expandForDocument = (document: NavDocument) => {
    const documentPath = `/documents/${document.id}`;
    const isDocumentActive = pathname === documentPath || pathname.startsWith(`${documentPath}/`);
    const hasActiveQuiz = document.quizzes.some((quiz) => pathname === `/quizzes/${quiz.id}`);

    if (isDocumentActive || hasActiveQuiz) {
      expanded.add(`doc:${document.id}`);
    }
  };

  for (const document of navigation.rootDocuments) {
    expandForDocument(document);
  }

  for (const [directoryId, documents] of Object.entries(navigation.documentsByDirectoryId)) {
    for (const document of documents) {
      expandForDocument(document);
    }

    if (pathname === `/directories/${directoryId}`) {
      expanded.add(`dir:${directoryId}`);
    }
  }

  const walkDirectories = (nodes: DirectoryTreeNode[]) => {
    for (const node of nodes) {
      if (pathname === `/directories/${node.id}`) {
        expanded.add(`dir:${node.id}`);
      }

      walkDirectories(node.children);
    }
  };

  walkDirectories(navigation.directories);
  return expanded;
}

function DocumentTreeItem({
  document,
  pathname,
  isOpen,
  isMobile,
  onClose,
  expandedIds,
  toggleExpanded,
}: {
  document: NavDocument;
  pathname: string;
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
}) {
  const documentPath = `/documents/${document.id}`;
  const isDocumentActive = pathname === documentPath;
  const expandedKey = `doc:${document.id}`;
  const isExpanded = expandedIds.has(expandedKey);
  const hasQuizzes = document.quizzes.length > 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
        <button
          type="button"
          className={`sidebar-tree-toggle${hasQuizzes ? '' : ' hidden'}`}
          onClick={() => toggleExpanded(expandedKey)}
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
          {isOpen ? <span className="sidebar-nav-item-text">{document.title}</span> : null}
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
}

function DirectoryTreeItem({
  directory,
  documents,
  pathname,
  isOpen,
  isMobile,
  onClose,
  expandedIds,
  toggleExpanded,
  documentsByDirectoryId,
  directoryCounts,
  depth = 0,
}: {
  directory: DirectoryTreeNode;
  documents: NavDocument[];
  pathname: string;
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  documentsByDirectoryId: Record<string, NavDocument[]>;
  directoryCounts: Record<string, { documentCount: number; childCount: number }>;
  depth?: number;
}) {
  const directoryPath = `/directories/${directory.id}`;
  const isDirectoryActive = pathname === directoryPath;
  const expandedKey = `dir:${directory.id}`;
  const isExpanded = expandedIds.has(expandedKey);
  const childDocuments = documentsByDirectoryId[directory.id] ?? documents;
  const hasChildren = directory.children.length > 0 || childDocuments.length > 0;
  const counts = directoryCounts[directory.id];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', paddingLeft: `${depth * 0.75}rem` }}>
        <button
          type="button"
          className={`sidebar-tree-toggle${hasChildren ? '' : ' hidden'}`}
          onClick={() => toggleExpanded(expandedKey)}
          aria-label={isExpanded ? 'Collapse directory' : 'Expand directory'}
          aria-expanded={isExpanded}
        >
          {hasChildren ? <ChevronIcon expanded={isExpanded} /> : null}
        </button>
        <Link
          href={directoryPath}
          className={`sidebar-nav-item${isDirectoryActive ? ' active' : ''}`}
          style={{ flex: 1, minWidth: 0 }}
          onClick={isMobile ? onClose : undefined}
        >
          <span className="sidebar-nav-item-icon">
            <FolderIcon />
          </span>
          {isOpen ? (
            <span className="sidebar-nav-item-text">
              {directory.name}
              {counts && counts.documentCount > 0 ? (
                <span className="sidebar-count-badge">{counts.documentCount}</span>
              ) : null}
            </span>
          ) : null}
        </Link>
      </div>

      {isOpen && isExpanded ? (
        <div className="sidebar-tree-children">
          {childDocuments.map((document) => (
            <DocumentTreeItem
              key={document.id}
              document={document}
              pathname={pathname}
              isOpen={isOpen}
              isMobile={isMobile}
              onClose={onClose}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
            />
          ))}
          {directory.children.map((child) => (
            <DirectoryTreeItem
              key={child.id}
              directory={child}
              documents={documentsByDirectoryId[child.id] ?? []}
              pathname={pathname}
              isOpen={isOpen}
              isMobile={isMobile}
              onClose={onClose}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              documentsByDirectoryId={documentsByDirectoryId}
              directoryCounts={directoryCounts}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({
  navigation,
  userEmail,
  isOpen,
  onClose,
}: {
  navigation: NavigationTree;
  userEmail: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    getInitialExpandedIds(navigation, pathname),
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
      for (const id of getInitialExpandedIds(navigation, pathname)) {
        next.add(id);
      }
      return next;
    });
  }, [navigation, pathname]);

  const isDocumentsActive = pathname === '/documents';
  const isRulesActive = pathname === '/rules';

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
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

  const hasTreeContent =
    navigation.directories.length > 0 || navigation.rootDocuments.length > 0;

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
            <Link
              href="/rules"
              className={`sidebar-nav-item${isRulesActive ? ' active' : ''}`}
              onClick={isMobile ? onClose : undefined}
            >
              <span className="sidebar-nav-item-icon">
                <RulesIcon />
              </span>
              {isOpen ? <span className="sidebar-nav-item-text">Rules</span> : null}
            </Link>
          </nav>

          <div className="sidebar-section-label">Directory</div>
          <nav className="sidebar-nav" aria-label="Directory">
            {!hasTreeContent ? (
              <p className="muted" style={{ padding: '0.25rem 0.625rem', margin: 0, fontSize: '0.8125rem' }}>
                {isOpen ? 'No folders yet' : '—'}
              </p>
            ) : (
              <>
                {navigation.rootDocuments.map((document) => (
                  <DocumentTreeItem
                    key={document.id}
                    document={document}
                    pathname={pathname}
                    isOpen={isOpen}
                    isMobile={isMobile}
                    onClose={onClose}
                    expandedIds={expandedIds}
                    toggleExpanded={toggleExpanded}
                  />
                ))}
                {navigation.directories.map((directory) => (
                  <DirectoryTreeItem
                    key={directory.id}
                    directory={directory}
                    documents={navigation.documentsByDirectoryId[directory.id] ?? []}
                    pathname={pathname}
                    isOpen={isOpen}
                    isMobile={isMobile}
                    onClose={onClose}
                    expandedIds={expandedIds}
                    toggleExpanded={toggleExpanded}
                    documentsByDirectoryId={navigation.documentsByDirectoryId}
                    directoryCounts={navigation.directoryCounts}
                  />
                ))}
              </>
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
