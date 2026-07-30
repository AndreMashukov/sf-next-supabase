import { NotFoundError } from '@sf/api-domain';
import type {
  DocumentRepository,
  QuizGeneratorService,
  QuizRepository,
  StorageService,
} from '@sf/api-domain';

export class GenerateQuizUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly quizRepository: QuizRepository,
    private readonly storageService: StorageService,
    private readonly quizGenerator: QuizGeneratorService,
  ) {}

  async execute(input: {
    userId: string;
    documentId: string;
    title?: string;
    questionCount: number;
  }) {
    const document = await this.documentRepository.findByIdForUser(
      input.documentId,
      input.userId,
    );

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    const html = await this.storageService.downloadHtml(document.storagePath);
    const generated = await this.quizGenerator.generateFromHtml(
      html,
      document.title,
      input.questionCount,
    );

    return this.quizRepository.create({
      userId: input.userId,
      documentId: input.documentId,
      title: input.title ?? generated.title,
      questions: generated.questions,
    });
  }
}
