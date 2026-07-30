'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { DirectorySummary } from '@/lib/data/directory-summaries';
import { DirectoryPickerDialog } from '@/components/DirectoryPickerDialog';
import { DeleteDirectoryDialog } from '@/components/DeleteDirectoryDialog';
import { moveDirectory } from '@/lib/api';
import type { DirectoryDeleteImpact } from '@/lib/data/directory-summaries';
import { getDescendantDirectoryIds } from '@/lib/directory-utils';
import type { Directory } from '@sf/shared-types';

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

export function FolderCard({
  folder,
  allFolders,
  deleteImpact,
  onMoved,
  onDeleted,
}: {
  folder: DirectorySummary;
  allFolders: DirectorySummary[];
  deleteImpact?: DirectoryDeleteImpact;
  onMoved?: (folder: Directory) => void;
  onDeleted?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const disabledMoveTargets = useMemo(() => {
    const directories = allFolders.map(({ ruleIds: _ruleIds, documentCount: _dc, childCount: _cc, ...directory }) => directory);
    return getDescendantDirectoryIds(directories, folder.id);
  }, [allFolders, folder.id]);

  return (
    <>
      <article className="folder-card">
        <Link href={`/directories/${folder.id}`} className="folder-card-link">
          <div className="folder-card-icon">
            <FolderIcon />
          </div>
          <div className="folder-card-body">
            <h3>{folder.name}</h3>
            {folder.description ? <p className="muted">{folder.description}</p> : null}
            <p className="folder-card-meta">
              {folder.documentCount} document{folder.documentCount === 1 ? '' : 's'} ·{' '}
              {folder.childCount} folder{folder.childCount === 1 ? '' : 's'}
            </p>
          </div>
        </Link>
        <div className="folder-card-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Folder actions"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ⋯
          </button>
          {menuOpen ? (
            <div className="folder-card-menu">
              <Link href={`/directories/${folder.id}`} className="folder-card-menu-item">
                Open
              </Link>
              <button
                type="button"
                className="folder-card-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  setMoveOpen(true);
                }}
              >
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
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </article>

      <DirectoryPickerDialog
        title={`Move ${folder.name}`}
        folders={allFolders.filter((item) => item.id !== folder.id)}
        currentDirectoryId={folder.parentId}
        disabledDirectoryIds={disabledMoveTargets}
        allowRoot
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        onConfirm={async (targetDirectoryId) => {
          const updated = await moveDirectory(folder.id, targetDirectoryId ?? undefined);
          onMoved?.(updated);
        }}
      />

      {deleteImpact ? (
        <DeleteDirectoryDialog
          directory={folder}
          impact={deleteImpact}
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => onDeleted?.()}
        />
      ) : null}
    </>
  );
}

export function FolderCardGrid({
  folders,
  allFolders,
  deleteImpacts,
  onFolderMoved,
  onFolderDeleted,
}: {
  folders: DirectorySummary[];
  allFolders: DirectorySummary[];
  deleteImpacts?: Record<string, DirectoryDeleteImpact>;
  onFolderMoved?: (folder: Directory) => void;
  onFolderDeleted?: (folderId: string) => void;
}) {
  if (folders.length === 0) {
    return null;
  }

  return (
    <div className="folder-card-grid">
      {folders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          allFolders={allFolders}
          deleteImpact={deleteImpacts?.[folder.id]}
          onMoved={onFolderMoved}
          onDeleted={() => onFolderDeleted?.(folder.id)}
        />
      ))}
    </div>
  );
}
