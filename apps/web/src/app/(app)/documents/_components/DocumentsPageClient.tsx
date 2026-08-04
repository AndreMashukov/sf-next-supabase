'use client';

import { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { CreateDirectoryDialog } from '@/components/directories/CreateDirectoryDialog';
import { FolderCardGrid } from '@/components/directories/FolderCard';
import { UnfiledCleanupBanner } from '@/components/documents/UnfiledCleanupBanner';
import type { DirectoryDeleteImpact, DirectorySummary } from '@/data/directory-summaries';
import type { Document, Rule } from '@sf/shared-types';

export function DocumentsPageClient({
  initialDocuments,
  initialRules: _initialRules,
  initialFolders,
  allFolders,
  deleteImpacts,
}: {
  initialDocuments: Document[];
  initialRules: Rule[];
  initialFolders: DirectorySummary[];
  allFolders: DirectorySummary[];
  deleteImpacts: Record<string, DirectoryDeleteImpact>;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [folders, setFolders] = useState(initialFolders);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="root-documents-page">
      <div className="root-documents-header">
        <h1 className="page-title">Root</h1>
        <button type="button" className="button secondary" onClick={() => setCreateOpen(true)}>
          <FolderPlus size={16} />
          New Folder
        </button>
      </div>

      <UnfiledCleanupBanner
        documents={documents}
        allFolders={allFolders}
        onDocumentMoved={(documentId) =>
          setDocuments((current) => current.filter((item) => item.id !== documentId))
        }
      />

      {folders.length > 0 ? (
        <FolderCardGrid
          folders={folders}
          allFolders={allFolders}
          deleteImpacts={deleteImpacts}
          onFolderMoved={(folder) =>
            setFolders((current) =>
              current.map((item) => (item.id === folder.id ? { ...item, ...folder } : item)),
            )
          }
          onFolderDeleted={(folderId) =>
            setFolders((current) => current.filter((folder) => folder.id !== folderId))
          }
          onFolderUpdated={(folder) =>
            setFolders((current) =>
              current.map((item) => (item.id === folder.id ? { ...item, ...folder } : item)),
            )
          }
          onManageRules={(folderId) => {
            window.location.href = `/directories/${folderId}?tab=rules`;
          }}
        />
      ) : (
        <div className="root-empty-state">
          <p className="muted">No folders yet. Create your first folder to organize documents.</p>
          <button type="button" className="button" onClick={() => setCreateOpen(true)}>
            <FolderPlus size={16} />
            New Folder
          </button>
        </div>
      )}

      <CreateDirectoryDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(directory) => setFolders((current) => [...current, directory])}
      />
    </div>
  );
}
