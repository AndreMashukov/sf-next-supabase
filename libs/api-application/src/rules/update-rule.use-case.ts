import type { RuleRepository, UpdateRuleInput } from '@sf/api-domain';

export class UpdateRuleUseCase {
  constructor(private readonly ruleRepository: RuleRepository) {}

  execute(input: UpdateRuleInput) {
    return this.ruleRepository.update(input);
  }
}
