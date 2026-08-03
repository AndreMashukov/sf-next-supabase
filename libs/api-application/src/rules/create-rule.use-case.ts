import type { CreateRuleInput, RuleRepository } from '@sf/api-domain';

export class CreateRuleUseCase {
  constructor(private readonly ruleRepository: RuleRepository) {}

  execute(input: CreateRuleInput) {
    return this.ruleRepository.create(input);
  }
}
