import {
  buildDirectoryTree,
  getDirectoryAncestorIds,
  mapDirectoryRow,
  resolveEffectiveRuleIds,
} from '@sf/api-domain';
import { describe, expect, it } from 'vitest';

describe('mapDirectoryRow', () => {
  it('maps snake_case database rows to camelCase API DTOs', () => {
    expect(
      mapDirectoryRow({
        id: 'dir-1',
        user_id: 'user-1',
        parent_id: null,
        name: 'Root',
        description: 'Top level',
        path: '/Root',
        level: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
      }),
    ).toEqual({
      id: 'dir-1',
      userId: 'user-1',
      parentId: null,
      name: 'Root',
      description: 'Top level',
      path: '/Root',
      level: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });
});

describe('resolveEffectiveRuleIds', () => {
  const directories = [
    {
      id: 'dir-parent',
      userId: 'user-1',
      parentId: null,
      name: 'Parent',
      description: '',
      path: '/Parent',
      level: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'dir-child',
      userId: 'user-1',
      parentId: 'dir-parent',
      name: 'Child',
      description: '',
      path: '/Parent/Child',
      level: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  it('returns inherited rules in parent-first order and dedupes explicit ids', () => {
    const ruleIdsByDirectory = new Map([
      ['dir-parent', ['rule-a', 'rule-b']],
      ['dir-child', ['rule-b', 'rule-c']],
    ]);

    expect(
      resolveEffectiveRuleIds(directories, 'dir-child', ruleIdsByDirectory, [
        'rule-c',
        'rule-d',
      ]),
    ).toEqual(['rule-a', 'rule-b', 'rule-c', 'rule-d']);
  });
});

describe('buildDirectoryTree', () => {
  it('nests directories and sorts by name', () => {
    const tree = buildDirectoryTree(
      [
        {
          id: 'dir-b',
          userId: 'user-1',
          parentId: null,
          name: 'Beta',
          description: '',
          path: '/Beta',
          level: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'dir-a',
          userId: 'user-1',
          parentId: null,
          name: 'Alpha',
          description: '',
          path: '/Alpha',
          level: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'dir-a1',
          userId: 'user-1',
          parentId: 'dir-a',
          name: 'Nested',
          description: '',
          path: '/Alpha/Nested',
          level: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      new Map([['dir-a', ['rule-1']]]),
    );

    expect(tree.map((node) => node.name)).toEqual(['Alpha', 'Beta']);
    expect(tree[0]?.children[0]?.name).toBe('Nested');
    expect(tree[0]?.ruleIds).toEqual(['rule-1']);
  });
});

describe('getDirectoryAncestorIds', () => {
  it('returns ancestor ids followed by the target directory id', () => {
    expect(
      getDirectoryAncestorIds(
        [
          {
            id: 'dir-parent',
            userId: 'user-1',
            parentId: null,
            name: 'Parent',
            description: '',
            path: '/Parent',
            level: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'dir-child',
            userId: 'user-1',
            parentId: 'dir-parent',
            name: 'Child',
            description: '',
            path: '/Parent/Child',
            level: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        'dir-child',
      ),
    ).toEqual(['dir-parent', 'dir-child']);
  });
});
