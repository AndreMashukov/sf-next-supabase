import {
  buildDirectorySummaries,
  computeDeleteImpact,
  getDescendantDirectoryIds,
} from '../directory-utils';
import { describe, expect, it } from 'vitest';

const directories = [
  {
    id: 'root',
    userId: 'user-1',
    parentId: null,
    name: 'Root',
    description: '',
    path: '/Root',
    level: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'child',
    userId: 'user-1',
    parentId: 'root',
    name: 'Child',
    description: '',
    path: '/Root/Child',
    level: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('buildDirectorySummaries', () => {
  it('computes child and document counts', () => {
    const summaries = buildDirectorySummaries(
      directories,
      [{ directory_id: 'root' }, { directory_id: 'child' }, { directory_id: 'child' }],
      new Map([['root', ['rule-1']]]),
    );

    expect(summaries.find((summary) => summary.id === 'root')).toEqual(
      expect.objectContaining({
        childCount: 1,
        documentCount: 1,
        ruleIds: ['rule-1'],
      }),
    );
    expect(summaries.find((summary) => summary.id === 'child')).toEqual(
      expect.objectContaining({
        childCount: 0,
        documentCount: 2,
        ruleIds: [],
      }),
    );
  });
});

describe('getDescendantDirectoryIds', () => {
  it('returns the directory and all descendants', () => {
    expect(getDescendantDirectoryIds(directories, 'root')).toEqual(['root', 'child']);
  });
});

describe('computeDeleteImpact', () => {
  it('counts nested directories and documents for cascade delete', () => {
    expect(
      computeDeleteImpact(
        directories,
        [{ directory_id: 'root' }, { directory_id: 'child' }],
        'root',
      ),
    ).toEqual({
      directoryCount: 2,
      documentCount: 2,
    });
  });
});
