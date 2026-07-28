import {
  getAuthenticatedUserEmail,
  listDocumentsWithQuizzes,
  type NavDocument,
} from '@/lib/data/navigation';
import { AppShellClient } from './AppShellClient';

export async function AppShell({
  children,
  pageTitle,
}: {
  children: React.ReactNode;
  pageTitle?: string;
}) {
  const [documents, userEmail] = await Promise.all([
    listDocumentsWithQuizzes(),
    getAuthenticatedUserEmail(),
  ]);

  return (
    <AppShellClient documents={documents} userEmail={userEmail} pageTitle={pageTitle}>
      {children}
    </AppShellClient>
  );
}

export type { NavDocument };
