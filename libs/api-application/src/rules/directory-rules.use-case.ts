import { NotFoundError, type AttachRuleToDirectoryInput, type DirectoryRepository, type RuleRepository } from '@sf/api-domain';
import { getDirectoryOrThrow } from '../directories/directory.helpers';

export class AttachRuleToDirectoryUseCase {
  constructor(
    private readonly directoryRepository: DirectoryRepository,
    private readonly ruleRepository: RuleRepository,
  ) {}

  async execute(input: AttachRuleToDirectoryInput) {
    await getDirectoryOrThrow(this.directoryRepository, input.directoryId, input.userId);
    await this.ruleRepository.verifyOwnership(input.userId, [input.ruleId]);

    try {
      await this.directoryRepository.attachRule(input.directoryId, input.ruleId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        return { success: true as const };
      }

      throw error;
    }

    return { success: true as const };
  }
}

export class DetachRuleFromDirectoryUseCase {
  constructor(private readonly directoryRepository: DirectoryRepository) {}

  async execute(input: AttachRuleToDirectoryInput) {
    await getDirectoryOrThrow(this.directoryRepository, input.directoryId, input.userId);

    const detached = await this.directoryRepository.detachRule(input.directoryId, input.ruleId);

    if (!detached) {
      throw new NotFoundError('Rule attachment not found');
    }

    return { success: true as const };
  }
}
