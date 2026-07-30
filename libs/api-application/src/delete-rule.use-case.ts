import { NotFoundError } from '@sf/api-domain';
import type { DeleteRuleInput, RuleRepository } from '@sf/api-domain';

export class DeleteRuleUseCase {
  constructor(private readonly ruleRepository: RuleRepository) {}

  async execute(input: DeleteRuleInput): Promise<{ success: true }> {
    const deleted = await this.ruleRepository.delete(input);

    if (!deleted) {
      throw new NotFoundError('Rule not found');
    }

    return { success: true };
  }
}
