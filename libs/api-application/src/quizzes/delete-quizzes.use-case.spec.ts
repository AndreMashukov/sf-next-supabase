import { DeleteQuizzesUseCase } from '@sf/api-application';
import { NotFoundError } from '@sf/api-domain';
import { describe, expect, it, vi } from 'vitest';

describe('DeleteQuizzesUseCase', () => {
  it('deletes owned quizzes', async () => {
    const quizRepository = {
      deleteByIds: vi.fn().mockResolvedValue(2),
    };

    const useCase = new DeleteQuizzesUseCase(quizRepository);

    const result = await useCase.execute({
      userId: 'user-1',
      quizIds: ['quiz-1', 'quiz-2'],
    });

    expect(quizRepository.deleteByIds).toHaveBeenCalledWith('user-1', ['quiz-1', 'quiz-2']);
    expect(result).toEqual({
      success: true,
      deletedQuizzes: 2,
    });
  });

  it('throws when no owned quizzes are found', async () => {
    const quizRepository = {
      deleteByIds: vi.fn().mockResolvedValue(0),
    };

    const useCase = new DeleteQuizzesUseCase(quizRepository);

    await expect(
      useCase.execute({ userId: 'user-1', quizIds: ['missing-quiz'] }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
