import { listDocuments } from '@/lib/data/documents';
import { listRules } from '@/lib/data/rules';
import { DocumentsPageClient } from './DocumentsPageClient';

export default async function DocumentsPage() {
  const [documents, rules] = await Promise.all([listDocuments(), listRules()]);

  return <DocumentsPageClient initialDocuments={documents} initialRules={rules} />;
}
