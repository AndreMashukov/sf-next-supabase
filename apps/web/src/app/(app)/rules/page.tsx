import { listRules } from '@/data/rules';
import { RulesPageClient } from './_components/RulesPageClient';

export default async function RulesPage() {
  const rules = await listRules();

  return <RulesPageClient initialRules={rules} />;
}
