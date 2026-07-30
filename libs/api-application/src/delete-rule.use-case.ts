import { AppError, NotFoundError, type DeleteRuleInput, type DirectoryRepository, type RuleRepository } from '@sf/api-domain';

export class DeleteRuleUseCase {
  constructor(
    private readonly ruleRepository: RuleRepository,
    private readonly directoryRepository: DirectoryRepository,
  ) {}

  async execute(input: DeleteRuleInput): Promise<{ success: true }> {
    const attachedCount = await this.directoryRepository.countAttachedRules(input.ruleId);

    if (attachedCount > 0) {
      throw new AppError('Rule is attached to one or more directories and cannot be deleted');
    }

    const deleted = await this.ruleRepository.delete(input);

    if (!deleted) {
      throw new NotFoundError('Rule not found');
    }

    return { success: true };
  }
}
