import { getAuthenticatedUserEmail } from '@/data/navigation';
import { AppShellClient } from './AppShellClient';

export async function AppShell({
  children,
  pageTitle,
}: {
  children: React.ReactNode;
  pageTitle?: string;
}) {
  const userEmail = await getAuthenticatedUserEmail();

  return (
    <AppShellClient userEmail={userEmail} pageTitle={pageTitle}>
      {children}
    </AppShellClient>
  );
}
