import {
  getDirectoryAncestorIds,
  partitionDirectAndInheritedRules,
  resolveInheritedRuleIds,
} from './rules';
import { describe, expect, it } from 'vitest';

const directories = [
  {
    id: 'parent',
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
    id: 'child',
    userId: 'user-1',
    parentId: 'parent',
    name: 'Child',
    description: '',
    path: '/Parent/Child',
    level: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('resolveInheritedRuleIds', () => {
  it('returns parent-first inherited rule ids', () => {
    const ruleIdsByDirectory = new Map([
      ['parent', ['rule-parent']],
      ['child', ['rule-child']],
    ]);

    expect(resolveInheritedRuleIds(directories, ruleIdsByDirectory, 'child')).toEqual([
      'rule-parent',
      'rule-child',
    ]);
  });
});

describe('partitionDirectAndInheritedRules', () => {
  it('separates direct and inherited-only rules', () => {
    const rules = [
      {
        id: 'rule-parent',
        userId: 'user-1',
        name: 'Parent',
        description: '',
        content: 'Parent',
        isDefault: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'rule-child',
        userId: 'user-1',
        name: 'Child',
        description: '',
        content: 'Child',
        isDefault: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const result = partitionDirectAndInheritedRules(
      rules,
      ['rule-child'],
      ['rule-parent', 'rule-child'],
    );

    expect(result.directRules.map((rule) => rule.id)).toEqual(['rule-child']);
    expect(result.inheritedRules.map((rule) => rule.id)).toEqual(['rule-parent']);
  });
});

describe('getDirectoryAncestorIds', () => {
  it('returns ancestor ids ending with the target directory', () => {
    expect(getDirectoryAncestorIds(directories, 'child')).toEqual(['parent', 'child']);
  });
});
