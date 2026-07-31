import { NotFoundError, type DeleteQuizzesInput, type QuizRepository } from '@sf/api-domain';

export class DeleteQuizzesUseCase {
  constructor(private readonly quizRepository: QuizRepository) {}

  async execute(input: DeleteQuizzesInput) {
    const deletedQuizzes = await this.quizRepository.deleteByIds(
      input.userId,
      input.quizIds,
    );

    if (deletedQuizzes === 0) {
      throw new NotFoundError('No quizzes found');
    }

    return {
      success: true as const,
      deletedQuizzes,
    };
  }
}
