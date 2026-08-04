import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FOLDER_COLOR,
  DEFAULT_FOLDER_ICON,
  getDirectoryPresentationDefaults,
  getDocumentFallbackColor,
  resolveDirectoryColor,
  resolveDirectoryIcon,
} from './constants';

describe('folder-constants', () => {
  it('provides stable defaults', () => {
    expect(DEFAULT_FOLDER_COLOR).toBe('#8b5cf6');
    expect(DEFAULT_FOLDER_ICON).toBe('Folder');
  });

  it('derives deterministic presentation from directory id', () => {
    const first = getDirectoryPresentationDefaults('abc-123');
    const second = getDirectoryPresentationDefaults('abc-123');
    const other = getDirectoryPresentationDefaults('xyz-999');

    expect(first).toEqual(second);
    expect(first.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(first.icon.length).toBeGreaterThan(0);
    expect(other).not.toEqual(first);
  });

  it('resolves icon and color with fallbacks', () => {
    expect(resolveDirectoryColor(null)).toBe(DEFAULT_FOLDER_COLOR);
    expect(resolveDirectoryColor('#22c55e')).toBe('#22c55e');
    expect(resolveDirectoryIcon('Briefcase')).toBeTruthy();
    expect(resolveDirectoryIcon('Unknown')).toBe(resolveDirectoryIcon('Folder'));
  });

  it('derives document rail colors from id', () => {
    expect(getDocumentFallbackColor('doc-1')).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
