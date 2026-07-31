import { describe, expect, it } from 'vitest';
import { assertDirectoryInScope, createAgentRuntimeContext } from './context';

function createContext(directoryIds: string[]) {
  return createAgentRuntimeContext({
    deps: {
      directoryRepository: {} as never,
      documentRepository: {} as never,
      quizRepository: {} as never,
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
    },
    userId: 'user-1',
    directoryId: 'dir-root',
    directoryIds,
  });
}

describe('directory agent scope helpers', () => {
  it('allows directories inside the scoped subtree', () => {
    const context = createContext(['dir-root', 'dir-child']);
    expect(() => assertDirectoryInScope(context, 'dir-child')).not.toThrow();
  });

  it('rejects directories outside the scoped subtree', () => {
    const context = createContext(['dir-root']);
    expect(() => assertDirectoryInScope(context, 'dir-other')).toThrow(
      'Target directory is outside the current folder scope',
    );
  });
});
