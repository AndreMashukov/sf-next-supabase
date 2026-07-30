import type { Directory, Rule } from '@sf/shared-types';

export function getDirectoryAncestorIds(
  directories: Directory[],
  directoryId: string,
): string[] {
  const byId = new Map(directories.map((directory) => [directory.id, directory]));
  const ancestorIds: string[] = [];
  let current = byId.get(directoryId);

  while (current?.parentId) {
    ancestorIds.unshift(current.parentId);
    current = byId.get(current.parentId);
  }

  return [...ancestorIds, directoryId];
}

export function resolveInheritedRuleIds(
  directories: Directory[],
  ruleIdsByDirectory: Map<string, string[]>,
  directoryId: string,
): string[] {
  const chain = getDirectoryAncestorIds(directories, directoryId);
  const ruleIds: string[] = [];

  for (const id of chain) {
    for (const ruleId of ruleIdsByDirectory.get(id) ?? []) {
      if (!ruleIds.includes(ruleId)) {
        ruleIds.push(ruleId);
      }
    }
  }

  return ruleIds;
}

export function partitionDirectAndInheritedRules(
  rules: Rule[],
  directRuleIds: string[],
  inheritedRuleIds: string[],
): { directRules: Rule[]; inheritedRules: Rule[] } {
  const directSet = new Set(directRuleIds);
  const inheritedOnlyIds = inheritedRuleIds.filter((ruleId) => !directSet.has(ruleId));
  const byId = new Map(rules.map((rule) => [rule.id, rule]));

  return {
    directRules: directRuleIds
      .map((ruleId) => byId.get(ruleId))
      .filter((rule): rule is Rule => Boolean(rule)),
    inheritedRules: inheritedOnlyIds
      .map((ruleId) => byId.get(ruleId))
      .filter((rule): rule is Rule => Boolean(rule)),
  };
}
