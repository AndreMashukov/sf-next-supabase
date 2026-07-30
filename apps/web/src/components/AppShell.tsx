import {
  getAuthenticatedUserEmail,
  listNavigationTree,
  type NavDocument,
  type NavigationTree,
} from '@/lib/data/navigation';
import { AppShellClient } from './AppShellClient';

export async function AppShell({
  children,
  pageTitle,
}: {
  children: React.ReactNode;
  pageTitle?: string;
}) {
  const [navigation, userEmail] = await Promise.all([
    listNavigationTree(),
    getAuthenticatedUserEmail(),
  ]);

  return (
    <AppShellClient navigation={navigation} userEmail={userEmail} pageTitle={pageTitle}>
      {children}
    </AppShellClient>
  );
}

export type { NavDocument, NavigationTree };
