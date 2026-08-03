import { NotFoundError, type DeleteQuizzesInput, type QuizRepository } from '@sf/api-domain';
import type { KnowledgeIndexerService } from '../knowledge/knowledge-indexer.service';

export class DeleteQuizzesUseCase {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly knowledgeIndexer?: KnowledgeIndexerService,
  ) {}

  async execute(input: DeleteQuizzesInput) {
    if (this.knowledgeIndexer) {
      for (const quizId of input.quizIds) {
        await this.knowledgeIndexer.deleteQuizIndex(input.userId, quizId);
      }
    }

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
