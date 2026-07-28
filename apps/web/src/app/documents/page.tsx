import { listDocuments } from '@/lib/data/documents';
import { DocumentsPageClient } from './DocumentsPageClient';

export default async function DocumentsPage() {
  const documents = await listDocuments();

  return <DocumentsPageClient initialDocuments={documents} />;
}
