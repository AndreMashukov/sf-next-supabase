'use client';

import { useMemo, useState } from 'react';
import type { DirectorySummary } from '@/data/directory-summaries';

const ROOT_TARGET = '__root__';

export type DirectoryPickerTarget = string | typeof ROOT_TARGET | null;

type DirectoryTreeNode = DirectorySummary & { children: DirectoryTreeNode[] };

function buildTree(folders: DirectorySummary[]): DirectoryTreeNode[] {
  const nodes = new Map<string, DirectoryTreeNode>(
    folders.map((folder) => [folder.id, { ...folder, children: [] }]),
  );
  const roots: DirectoryTreeNode[] = [];

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: DirectoryTreeNode[]) => {
    items.sort((left, right) => left.name.localeCompare(right.name));
    for (const item of items) {
      sortNodes(item.children);
    }
  };

  sortNodes(roots);
  return roots;
}

function TreeOption({
  folder,
  depth,
  disabledIds,
  selectedId,
  onSelect,
}: {
  folder: DirectoryTreeNode;
  depth: number;
  disabledIds: Set<string>;
  selectedId: DirectoryPickerTarget;
  onSelect: (target: DirectoryPickerTarget) => void;
}) {
  const disabled = disabledIds.has(folder.id);

  return (
    <>
      <button
        type="button"
        className={`directory-picker-option${selectedId === folder.id ? ' selected' : ''}`}
        style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
        disabled={disabled}
        onClick={() => onSelect(folder.id)}
      >
        <span>{folder.name}</span>
        <span className="muted">
          {folder.documentCount} docs · {folder.childCount} folders
        </span>
      </button>
      {folder.children.map((child) => (
        <TreeOption
          key={child.id}
          folder={child}
          depth={depth + 1}
          disabledIds={disabledIds}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export function DirectoryPickerDialog({
  title,
  folders,
  currentDirectoryId,
  disabledDirectoryIds = [],
  allowRoot = false,
  open,
  onClose,
  onConfirm,
}: {
  title: string;
  folders: DirectorySummary[];
  currentDirectoryId?: string | null;
  disabledDirectoryIds?: string[];
  allowRoot?: boolean;
  open: boolean;
  onClose: () => void;
  onConfirm: (targetDirectoryId: string | null) => void | Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<DirectoryPickerTarget>(
    currentDirectoryId ?? (allowRoot ? ROOT_TARGET : null),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(folders), [folders]);
  const disabledIds = useMemo(() => new Set(disabledDirectoryIds), [disabledDirectoryIds]);

  if (!open) {
    return null;
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      const targetDirectoryId =
        selectedId === ROOT_TARGET || selectedId === null ? null : selectedId;
      await onConfirm(targetDirectoryId);
      onClose();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Move failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby="directory-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <h2 id="directory-picker-title">{title}</h2>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Choose a destination folder.
          </p>
        </div>
        <div className="directory-picker-list">
          {allowRoot ? (
            <button
              type="button"
              className={`directory-picker-option${selectedId === ROOT_TARGET ? ' selected' : ''}`}
              onClick={() => setSelectedId(ROOT_TARGET)}
            >
              <span>Root</span>
              <span className="muted">Top level</span>
            </button>
          ) : null}
          {tree.map((folder) => (
            <TreeOption
              key={folder.id}
              folder={folder}
              depth={0}
              disabledIds={disabledIds}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))}
        </div>
        {error ? <div className="error">{error}</div> : null}
        <div className="button-row">
          <button className="button secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="button"
            type="button"
            disabled={loading || (!allowRoot && !selectedId)}
            onClick={handleConfirm}
          >
            {loading ? 'Moving...' : 'Move here'}
          </button>
        </div>
      </div>
    </div>
  );
}

export { ROOT_TARGET };
