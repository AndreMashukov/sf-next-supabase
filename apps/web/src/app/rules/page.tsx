import { listRules } from '@/lib/data/rules';
import { RulesPageClient } from './RulesPageClient';

export default async function RulesPage() {
  const rules = await listRules();

  return <RulesPageClient initialRules={rules} />;
}
