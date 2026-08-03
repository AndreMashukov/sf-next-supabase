import {
  NotFoundError,
  type DocumentRepository,
  type QuizRepository,
  type UpdateQuizInput,
} from '@sf/api-domain';
import { KnowledgeIndexerService } from '../knowledge/knowledge-indexer.service';

export class UpdateQuizUseCase {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly knowledgeIndexer: KnowledgeIndexerService,
  ) {}

  async execute(input: UpdateQuizInput) {
    const quiz = await this.quizRepository.findByIdForUser(input.quizId, input.userId);

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    const updatedQuiz = await this.quizRepository.update({
      userId: input.userId,
      quizId: input.quizId,
      title: input.title,
      questions: input.questions,
    });

    const document = await this.documentRepository.findByIdForUser(
      updatedQuiz.documentId,
      input.userId,
    );

    await this.knowledgeIndexer.indexQuiz(updatedQuiz, document?.directoryId ?? null);

    return updatedQuiz;
  }
}
