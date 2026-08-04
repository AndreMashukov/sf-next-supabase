'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  FolderPlus,
  MoreVertical,
  Pencil,
  Trash2,
  Move,
  FileCode,
} from 'lucide-react';
import type { Directory, Document, Rule } from '@sf/shared-types';
import type { DirectoryDeleteImpact, DirectorySummary } from '@/data/directory-summaries';
import { DirectoryIconSidebar, type DirectoryPanelType } from '@/components/directories/DirectoryIconSidebar';
import { SourcesPanel } from '@/components/documents/SourcesPanel';
import { AddSourceModal } from '@/components/documents/AddSourceModal';
import { CreateDirectoryDialog } from '@/components/directories/CreateDirectoryDialog';
import { EditDirectoryDialog } from '@/components/directories/EditDirectoryDialog';
import { DeleteDirectoryDialog } from '@/components/directories/DeleteDirectoryDialog';
import { DirectoryPickerDialog } from '@/components/directories/DirectoryPickerDialog';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { QuizzesPanel } from '@/components/quizzes/QuizzesPanel';
import { DirectoryRuleManager } from '@/components/directories/DirectoryRuleManager';
import type { QuizWithDocumentTitle } from '@/data/quizzes';
import { resolveDirectoryColor, resolveDirectoryIcon } from '@/domain/directories/constants';
import { getDescendantDirectoryIds } from '@/domain/directories/utils';
import { moveDirectory } from '@/mutations';
import { useGenerationJobsRealtime } from '@/hooks/useGenerationJobsRealtime';

const VALID_PANELS = new Set<string>([
  'sources',
  'quizzes',
  'cards',
  'slides',
  'diagrams',
  'sequence',
  'worlds',
  'chat',
  'rules',
]);

function SubfolderPill({
  folder,
  allFolders,
  deleteImpact,
  onDeleted,
  onUpdated,
  onManageRules,
}: {
  folder: DirectorySummary;
  allFolders: DirectorySummary[];
  deleteImpact?: DirectoryDeleteImpact;
  onDeleted: () => void;
  onUpdated: (folder: Directory) => void;
  onManageRules: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const Icon = resolveDirectoryIcon(folder.icon);

  const disabledMoveTargets = useMemo(() => {
    const directories = allFolders.map(
      ({ ruleIds: _r, documentCount: _d, childCount: _c, ...directory }) => directory,
    );
    return getDescendantDirectoryIds(directories, folder.id);
  }, [allFolders, folder.id]);

  return (
    <>
      <div className="subfolder-pill">
        <Link href={`/directories/${folder.id}`} className="subfolder-pill-link">
          <Icon size={16} color={resolveDirectoryColor(folder.color)} />
          <span>{folder.name}</span>
        </Link>
        <DropdownMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          className="subfolder-pill-menu-wrap"
          trigger={
            <button
              type="button"
              className="icon-button subfolder-pill-menu"
              aria-label={`Actions for ${folder.name}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreVertical size={14} />
            </button>
          }
        >
          <button
            type="button"
            className="folder-card-menu-item"
            onClick={() => {
              setMenuOpen(false);
              setEditOpen(true);
            }}
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            type="button"
            className="folder-card-menu-item"
            onClick={() => {
              setMenuOpen(false);
              onManageRules();
            }}
          >
            <FileCode size={14} />
            Manage Rules
          </button>
          <button
            type="button"
            className="folder-card-menu-item"
            onClick={() => {
              setMenuOpen(false);
              setMoveOpen(true);
            }}
          >
            <Move size={14} />
            Move
          </button>
          <button
            type="button"
            className="folder-card-menu-item danger"
            onClick={() => {
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </DropdownMenu>
      </div>

      <EditDirectoryDialog
        open={editOpen}
        directory={folder}
        onClose={() => setEditOpen(false)}
        onUpdated={onUpdated}
      />
      <DirectoryPickerDialog
        title={`Move ${folder.name}`}
        folders={allFolders.filter((item) => item.id !== folder.id)}
        currentDirectoryId={folder.parentId}
        disabledDirectoryIds={disabledMoveTargets}
        allowRoot
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        onConfirm={async (targetDirectoryId) => {
          await moveDirectory(folder.id, targetDirectoryId ?? undefined);
        }}
      />
      {deleteImpact ? (
        <DeleteDirectoryDialog
          directory={folder}
          impact={deleteImpact}
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onDeleted={onDeleted}
        />
      ) : null}
    </>
  );
}

function PlaceholderPanel({ title }: { title: string }) {
  return (
    <section className="directory-placeholder-panel">
      <h2>{title}</h2>
      <p className="muted">This section is coming soon.</p>
    </section>
  );
}

export function DirectoryDetailClient({
  directory,
  ancestors,
  childFolders,
  documents,
  rules,
  attachedRuleIds,
  inheritedRules,
  directRules,
  allFolders,
  deleteImpact,
  childDeleteImpacts,
  quizzes,
}: {
  directory: Directory;
  ancestors: Directory[];
  childFolders: DirectorySummary[];
  documents: Document[];
  rules: Rule[];
  attachedRuleIds: string[];
  inheritedRules: Rule[];
  directRules: Rule[];
  allFolders: DirectorySummary[];
  deleteImpact: DirectoryDeleteImpact;
  childDeleteImpacts: Record<string, DirectoryDeleteImpact>;
  quizzes: QuizWithDocumentTitle[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialPanel: DirectoryPanelType =
    tabParam && VALID_PANELS.has(tabParam) ? (tabParam as DirectoryPanelType) : 'sources';

  const [activePanel, setActivePanel] = useState<DirectoryPanelType>(initialPanel);
  const [currentDirectory, setCurrentDirectory] = useState(directory);
  const [folderRules, setFolderRules] = useState(attachedRuleIds);
  const [childFolderList, setChildFolderList] = useState(childFolders);
  const [documentList, setDocumentList] = useState(documents);
  const [quizList, setQuizList] = useState(quizzes);
  const [createSubfolderOpen, setCreateSubfolderOpen] = useState(false);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const documentIds = useMemo(() => documentList.map((document) => document.id), [documentList]);

  const { scopedPendingJobs, registerJob } = useGenerationJobsRealtime({
    directoryId: currentDirectory.id,
    documentIds,
    onCompleted: (job) => {
      setGenerationError(null);
      if (job.result.primaryArtifact?.type === 'quiz') {
        router.push(`/quizzes/${job.result.primaryArtifact.id}`);
      }
    },
    onFailed: (job) => {
      setGenerationError(job.errorMessage ?? 'Generation failed');
    },
  });

  const pendingDocumentJobs = useMemo(
    () => scopedPendingJobs.filter((job) => job.kind === 'document'),
    [scopedPendingJobs],
  );

  const pendingQuizJobs = useMemo(
    () => scopedPendingJobs.filter((job) => job.kind === 'quiz'),
    [scopedPendingJobs],
  );

  useEffect(() => {
    setDocumentList(documents);
  }, [documents]);

  useEffect(() => {
    setQuizList(quizzes);
  }, [quizzes]);

  const TitleIcon = resolveDirectoryIcon(currentDirectory.icon);
  const titleColor = resolveDirectoryColor(currentDirectory.color);

  const quizCountsByDocumentId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const quiz of quizList) {
      counts[quiz.documentId] = (counts[quiz.documentId] ?? 0) + 1;
    }
    return counts;
  }, [quizList]);

  const setPanel = useCallback(
    (panel: DirectoryPanelType) => {
      setActivePanel(panel);
      const params = new URLSearchParams(searchParams.toString());
      if (panel === 'sources') {
        params.delete('tab');
      } else {
        params.set('tab', panel);
      }
      const query = params.toString();
      router.replace(`/directories/${currentDirectory.id}${query ? `?${query}` : ''}`, {
        scroll: false,
      });
    },
    [currentDirectory.id, router, searchParams],
  );

  function handleBack() {
    if (ancestors.length > 0) {
      router.push(`/directories/${ancestors[ancestors.length - 1].id}`);
      return;
    }
    router.push('/documents');
  }

  return (
    <div className="directory-detail-page">
      <div className="directory-detail-header">
        <div className="directory-detail-back-row">
          <button type="button" className="directory-back-button" onClick={handleBack}>
            <ArrowLeft size={14} />
            Back
          </button>
          <span className="directory-back-separator">|</span>
          <nav className="directory-detail-breadcrumb" aria-label="Breadcrumb">
            <Link href="/documents">Directories</Link>
            {ancestors.map((ancestor) => (
              <span key={ancestor.id}>
                <span className="breadcrumb-separator">/</span>
                <Link href={`/directories/${ancestor.id}`}>{ancestor.name}</Link>
              </span>
            ))}
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{currentDirectory.name}</span>
          </nav>
        </div>

        <div className="directory-detail-title-row">
          <div className="directory-detail-title-block">
            <h1>
              <TitleIcon size={28} color={titleColor} />
              {currentDirectory.name}
            </h1>
            {currentDirectory.description ? (
              <p className="muted directory-detail-description">{currentDirectory.description}</p>
            ) : null}
          </div>
          <div className="directory-detail-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => setCreateSubfolderOpen(true)}
            >
              <FolderPlus size={16} />
              New subfolder
            </button>
            <button type="button" className="button" onClick={() => setAddSourceOpen(true)}>
              Add source
            </button>
            <DropdownMenu
              open={headerMenuOpen}
              onOpenChange={setHeaderMenuOpen}
              className="directory-header-menu-wrap"
              trigger={
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Folder settings"
                  aria-expanded={headerMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setHeaderMenuOpen((open) => !open)}
                >
                  <MoreVertical size={16} />
                </button>
              }
            >
              <button
                type="button"
                className="folder-card-menu-item"
                onClick={() => {
                  setHeaderMenuOpen(false);
                  setEditOpen(true);
                }}
              >
                <Pencil size={14} />
                Edit folder
              </button>
              <button
                type="button"
                className="folder-card-menu-item"
                onClick={() => {
                  setHeaderMenuOpen(false);
                  setPanel('rules');
                }}
              >
                <FileCode size={14} />
                Manage rules
              </button>
              <button
                type="button"
                className="folder-card-menu-item danger"
                onClick={() => {
                  setHeaderMenuOpen(false);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 size={14} />
                Delete folder
              </button>
            </DropdownMenu>
          </div>
        </div>

        {childFolderList.length > 0 ? (
          <div className="subfolder-pills-row">
            {childFolderList.map((folder) => (
              <SubfolderPill
                key={folder.id}
                folder={folder}
                allFolders={allFolders}
                deleteImpact={childDeleteImpacts[folder.id]}
                onDeleted={() =>
                  setChildFolderList((current) => current.filter((item) => item.id !== folder.id))
                }
                onUpdated={(updated) =>
                  setChildFolderList((current) =>
                    current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
                  )
                }
                onManageRules={() => router.push(`/directories/${folder.id}?tab=rules`)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {generationError ? <div className="error directory-generation-error">{generationError}</div> : null}

      <div className="directory-detail-body">
        <DirectoryIconSidebar activePanel={activePanel} onPanelChange={setPanel} />
        <div className="directory-detail-panel">
          {activePanel === 'sources' ? (
            <SourcesPanel
              documents={documentList}
              pendingDocumentJobs={pendingDocumentJobs}
              allFolders={allFolders}
              rules={rules}
              quizCountsByDocumentId={quizCountsByDocumentId}
              onDocumentMoved={(document) =>
                setDocumentList((current) => current.filter((item) => item.id !== document.id))
              }
              onDocumentsDeleted={(documentIds) => {
                setDocumentList((current) =>
                  current.filter((item) => !documentIds.includes(item.id)),
                );
                setQuizList((current) =>
                  current.filter((quiz) => !documentIds.includes(quiz.documentId)),
                );
                router.refresh();
              }}
            />
          ) : null}
          {activePanel === 'rules' ? (
            <DirectoryRuleManager
              directoryId={currentDirectory.id}
              rules={rules}
              attachedRuleIds={folderRules}
              inheritedRules={inheritedRules}
              onChanged={setFolderRules}
            />
          ) : null}
          {activePanel === 'quizzes' ? (
            <QuizzesPanel
              quizzes={quizList}
              documents={documentList}
              pendingQuizJobs={pendingQuizJobs}
              onJobStarted={registerJob}
              onQuizzesDeleted={(quizIds) => {
                setQuizList((current) => current.filter((quiz) => !quizIds.includes(quiz.id)));
                router.refresh();
              }}
            />
          ) : null}
          {activePanel === 'cards' ? <PlaceholderPanel title="Cards" /> : null}
          {activePanel === 'slides' ? <PlaceholderPanel title="Slides" /> : null}
          {activePanel === 'diagrams' ? <PlaceholderPanel title="Diagrams" /> : null}
          {activePanel === 'sequence' ? <PlaceholderPanel title="Sequence" /> : null}
          {activePanel === 'worlds' ? <PlaceholderPanel title="Worlds" /> : null}
          {activePanel === 'chat' ? <PlaceholderPanel title="Chat" /> : null}
        </div>
      </div>

      <CreateDirectoryDialog
        open={createSubfolderOpen}
        parentId={currentDirectory.id}
        onClose={() => setCreateSubfolderOpen(false)}
        onCreated={(folder) => setChildFolderList((current) => [...current, folder])}
      />

      <AddSourceModal
        open={addSourceOpen}
        onClose={() => setAddSourceOpen(false)}
        directoryId={currentDirectory.id}
        rules={rules}
        inheritedRules={inheritedRules}
        directRules={directRules}
        onJobStarted={(job) => {
          registerJob(job);
        }}
      />

      <EditDirectoryDialog
        open={editOpen}
        directory={currentDirectory}
        onClose={() => setEditOpen(false)}
        onUpdated={setCurrentDirectory}
      />

      <DeleteDirectoryDialog
        directory={currentDirectory}
        impact={deleteImpact}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          router.push(ancestors.length ? `/directories/${ancestors[ancestors.length - 1].id}` : '/documents');
        }}
      />
    </div>
  );
}
