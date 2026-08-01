import { describe, expect, it } from 'vitest';
import {
  assertDirectoryInScope,
  createAgentRuntimeContext,
  isDirectoryInScope,
  resolveDefaultParentId,
} from './context';

function createContext(input: {
  scope: 'workspace' | 'directory';
  directoryIds: string[];
  directoryId?: string;
}) {
  return createAgentRuntimeContext({
    deps: {
      directoryRepository: {} as never,
      documentRepository: {} as never,
      quizRepository: {} as never,
      ruleRepository: {} as never,
      vectorIndexRepository: {} as never,
      embeddingService: {} as never,
      createDirectoryUseCase: {} as never,
      updateDirectoryUseCase: {} as never,
      moveDirectoryUseCase: {} as never,
      createDocumentUseCase: {} as never,
      updateDocumentUseCase: {} as never,
      moveDocumentUseCase: {} as never,
      generateQuizUseCase: {} as never,
      updateQuizUseCase: {} as never,
      createRuleUseCase: {} as never,
      updateRuleUseCase: {} as never,
      attachRuleToDirectoryUseCase: {} as never,
      detachRuleFromDirectoryUseCase: {} as never,
    },
    userId: 'user-1',
    scope: input.scope,
    directoryId: input.directoryId,
    directoryIds: input.directoryIds,
  });
}

describe('directory agent scope helpers', () => {
  it('allows directories inside the scoped subtree in directory mode', () => {
    const context = createContext({
      scope: 'directory',
      directoryId: 'dir-root',
      directoryIds: ['dir-root', 'dir-child'],
    });
    expect(() => assertDirectoryInScope(context, 'dir-child')).not.toThrow();
  });

  it('rejects directories outside the scoped subtree in directory mode', () => {
    const context = createContext({
      scope: 'directory',
      directoryId: 'dir-root',
      directoryIds: ['dir-root'],
    });
    expect(() => assertDirectoryInScope(context, 'dir-other')).toThrow(
      'Target directory is outside the current scope',
    );
  });

  it('allows any listed directory in workspace mode', () => {
    const context = createContext({
      scope: 'workspace',
      directoryIds: ['dir-a', 'dir-b'],
    });
    expect(isDirectoryInScope(context, 'dir-b')).toBe(true);
    expect(isDirectoryInScope(context, 'dir-other')).toBe(false);
  });

  it('preserves an explicit out-of-scope parentId for downstream rejection', () => {
    const context = createContext({
      scope: 'directory',
      directoryId: 'dir-root',
      directoryIds: ['dir-root'],
    });

    expect(resolveDefaultParentId(context, 'dir-other')).toBe('dir-other');
    expect(() => assertDirectoryInScope(context, resolveDefaultParentId(context, 'dir-other'))).toThrow(
      'Target directory is outside the current scope',
    );
    expect(resolveDefaultParentId(context)).toBe('dir-root');
  });
});
