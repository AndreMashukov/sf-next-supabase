'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Edit,
  FileCode,
  FileText,
  FolderTree,
  MoreVertical,
  Move,
  Trash2,
} from 'lucide-react';
import type { DirectorySummary } from '@/lib/data/directory-summaries';
import { DirectoryPickerDialog } from '@/components/DirectoryPickerDialog';
import { DeleteDirectoryDialog } from '@/components/DeleteDirectoryDialog';
import { EditDirectoryDialog } from '@/components/EditDirectoryDialog';
import { DropdownMenu } from '@/components/DropdownMenu';
import { moveDirectory } from '@/lib/api';
import type { DirectoryDeleteImpact } from '@/lib/data/directory-summaries';
import { getDescendantDirectoryIds } from '@/lib/directory-utils';
import { resolveDirectoryColor, resolveDirectoryIcon } from '@/lib/folder-constants';
import type { Directory } from '@sf/shared-types';

export function FolderCard({
  folder,
  allFolders,
  deleteImpact,
  selected,
  onMoved,
  onDeleted,
  onUpdated,
  onManageRules,
}: {
  folder: DirectorySummary;
  allFolders: DirectorySummary[];
  deleteImpact?: DirectoryDeleteImpact;
  selected?: boolean;
  onMoved?: (folder: Directory) => void;
  onDeleted?: () => void;
  onUpdated?: (folder: Directory) => void;
  onManageRules?: (folderId: string) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const disabledMoveTargets = useMemo(() => {
    const directories = allFolders.map(
      ({ ruleIds: _ruleIds, documentCount: _dc, childCount: _cc, ...directory }) => directory,
    );
    return getDescendantDirectoryIds(directories, folder.id);
  }, [allFolders, folder.id]);

  const Icon = resolveDirectoryIcon(folder.icon);
  const color = resolveDirectoryColor(folder.color);

  function openFolder() {
    router.push(`/directories/${folder.id}`);
  }

  return (
    <>
      <article
        className={`folder-card-v2${selected ? ' selected' : ''}`}
        role="button"
        tabIndex={0}
        onClick={openFolder}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openFolder();
          }
        }}
      >
        <div className="folder-card-v2-icon">
          <Icon size={48} color={color} />
        </div>
        <div className="folder-card-v2-body">
          <h3>{folder.name}</h3>
          <div className="folder-card-v2-meta">
            <span>
              <FileText size={14} />
              {folder.documentCount}
            </span>
            <span>
              <FolderTree size={14} />
              {folder.childCount}
            </span>
          </div>
        </div>
        <DropdownMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          stopPropagation
          className={`folder-card-v2-actions${menuOpen ? ' open' : ''}`}
          trigger={
            <button
              type="button"
              className="icon-button"
              aria-label="Folder actions"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreVertical size={16} />
            </button>
          }
        >
          <Link
            href={`/directories/${folder.id}`}
            className="folder-card-menu-item"
            onClick={() => setMenuOpen(false)}
          >
            Open
          </Link>
          <button
            type="button"
            className="folder-card-menu-item"
            onClick={() => {
              setMenuOpen(false);
              setEditOpen(true);
            }}
          >
            <Edit size={14} />
            Edit
          </button>
          {onManageRules ? (
            <button
              type="button"
              className="folder-card-menu-item"
              onClick={() => {
                setMenuOpen(false);
                onManageRules(folder.id);
              }}
            >
              <FileCode size={14} />
              Manage Rules
            </button>
          ) : null}
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
      </article>

      <EditDirectoryDialog
        open={editOpen}
        directory={folder}
        onClose={() => setEditOpen(false)}
        onUpdated={(updated) => onUpdated?.(updated)}
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
  selectedFolderId,
  onFolderMoved,
  onFolderDeleted,
  onFolderUpdated,
  onManageRules,
}: {
  folders: DirectorySummary[];
  allFolders: DirectorySummary[];
  deleteImpacts?: Record<string, DirectoryDeleteImpact>;
  selectedFolderId?: string;
  onFolderMoved?: (folder: Directory) => void;
  onFolderDeleted?: (folderId: string) => void;
  onFolderUpdated?: (folder: Directory) => void;
  onManageRules?: (folderId: string) => void;
}) {
  if (folders.length === 0) {
    return null;
  }

  return (
    <div className="folder-card-grid-v2">
      {folders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          allFolders={allFolders}
          deleteImpact={deleteImpacts?.[folder.id]}
          selected={selectedFolderId === folder.id}
          onMoved={onFolderMoved}
          onDeleted={() => onFolderDeleted?.(folder.id)}
          onUpdated={onFolderUpdated}
          onManageRules={onManageRules}
        />
      ))}
    </div>
  );
}
