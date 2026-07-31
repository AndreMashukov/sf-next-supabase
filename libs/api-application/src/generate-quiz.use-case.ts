import { NotFoundError } from '@sf/api-domain';
import type {
  DocumentRepository,
  GenerationJobRepository,
  QuizGeneratorService,
  QuizRepository,
  StorageService,
} from '@sf/api-domain';
import type { GenerationJob, GenerationJobResult } from '@sf/shared-types';

export class GenerateQuizUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly quizRepository: QuizRepository,
    private readonly storageService: StorageService,
    private readonly quizGenerator: QuizGeneratorService,
    private readonly generationJobRepository: GenerationJobRepository,
  ) {}

  async start(input: {
    userId: string;
    documentId: string;
    title?: string;
    questionCount: number;
  }): Promise<GenerationJob> {
    await this.generationJobRepository.deleteExpired();

    const document = await this.documentRepository.findByIdForUser(
      input.documentId,
      input.userId,
    );

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    const job = await this.generationJobRepository.createPending({
      userId: input.userId,
      kind: 'quiz',
      input: {
        documentId: input.documentId,
        title: input.title,
        questionCount: input.questionCount,
      },
    });

    void this.runInBackground(job.id, input);

    return job;
  }

  private async runInBackground(
    jobId: string,
    input: {
      userId: string;
      documentId: string;
      title?: string;
      questionCount: number;
    },
  ): Promise<void> {
    try {
      const quiz = await this.generateQuiz(input);
      const result: GenerationJobResult = {
        primaryArtifact: { type: 'quiz', id: quiz.id },
        artifacts: [{ type: 'quiz', id: quiz.id }],
      };
      await this.generationJobRepository.markCompleted(jobId, input.userId, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Quiz generation failed';
      await this.generationJobRepository.markFailed(jobId, input.userId, message);
    }
  }

  private async generateQuiz(input: {
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
