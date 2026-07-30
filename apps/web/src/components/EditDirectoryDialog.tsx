'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  formatValidationError,
  updateDirectory,
  updateDirectorySchema,
} from '@/lib/api';
import {
  DEFAULT_FOLDER_COLOR,
  DEFAULT_FOLDER_ICON,
  FOLDER_COLORS,
  FOLDER_ICONS,
  resolveDirectoryColor,
  resolveDirectoryIcon,
} from '@/lib/folder-constants';
import type { Directory } from '@sf/shared-types';

export function EditDirectoryDialog({
  open,
  directory,
  onClose,
  onUpdated,
}: {
  open: boolean;
  directory: Directory | null;
  onClose: () => void;
  onUpdated: (directory: Directory) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_FOLDER_COLOR);
  const [icon, setIcon] = useState(DEFAULT_FOLDER_ICON);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !directory) {
      return;
    }
    setName(directory.name);
    setDescription(directory.description);
    setColor(resolveDirectoryColor(directory.color));
    setIcon(directory.icon || DEFAULT_FOLDER_ICON);
    setError(null);
  }, [open, directory]);

  if (!open || !directory) {
    return null;
  }

  const currentDirectory = directory;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const validation = updateDirectorySchema.safeParse({
      directoryId: currentDirectory.id,
      name,
      description,
      color,
      icon,
    });

    if (!validation.success) {
      setError(formatValidationError(validation.error));
      setLoading(false);
      return;
    }

    try {
      const updated = await updateDirectory({
        directoryId: currentDirectory.id,
        name,
        description,
        color,
        icon,
      });
      onUpdated(updated);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to update folder');
    } finally {
      setLoading(false);
    }
  }

  const PreviewIcon = resolveDirectoryIcon(icon);

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card modal-card-wide directory-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-folder-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="directory-dialog-header">
          <div className="directory-dialog-icon-wrap">
            <PreviewIcon size={22} color="#fff" />
          </div>
          <div>
            <h2 id="edit-folder-title">Edit folder</h2>
            <p className="muted">Update folder name, color, and icon.</p>
          </div>
        </div>

        <form className="stack directory-dialog-form" onSubmit={handleSubmit}>
          <label className="label">
            Name
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoFocus
            />
          </label>

          <label className="label">
            Description
            <textarea
              className="textarea compact-textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional notes"
            />
          </label>

          <fieldset className="directory-picker-fieldset">
            <legend className="directory-picker-legend">Color</legend>
            <div className="directory-color-grid">
              {FOLDER_COLORS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`directory-color-swatch${color === item.value ? ' selected' : ''}`}
                  style={{ backgroundColor: item.value }}
                  aria-label={item.name}
                  onClick={() => setColor(item.value)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="directory-picker-fieldset">
            <legend className="directory-picker-legend">Icon</legend>
            <div className="directory-icon-grid">
              {FOLDER_ICONS.map((item) => {
                const Icon = item.component;
                return (
                  <button
                    key={item.name}
                    type="button"
                    className={`directory-icon-option${icon === item.name ? ' selected' : ''}`}
                    aria-label={item.label}
                    onClick={() => setIcon(item.name)}
                  >
                    <Icon size={20} color={color} />
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error ? <div className="error">{error}</div> : null}

          <div className="button-row">
            <button type="button" className="button secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button" disabled={loading}>
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
