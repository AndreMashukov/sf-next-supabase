'use client';

import { useEffect } from 'react';
import { GlobalAgentLauncher } from '@/components/agent/GlobalAgentLauncher';
import { useNavigationRealtime } from '@/hooks/useNavigationRealtime';
import { UiStoreProvider, useUiStore } from '@/providers/ui-store-provider';
import { Sidebar } from './Sidebar';
import { TopAppBar } from './TopAppBar';

function AppShellFrame({
  children,
  userEmail,
  pageTitle,
}: {
  children: React.ReactNode;
  userEmail: string | null;
  pageTitle?: string;
}) {
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const isMobile = useUiStore((state) => state.isMobile);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const setIsMobile = useUiStore((state) => state.setIsMobile);

  useNavigationRealtime();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  const contentMargin = !isMobile
    ? sidebarOpen
      ? 'var(--sidebar-width)'
      : 'var(--sidebar-collapsed-width)'
    : '0px';

  return (
    <div className="app-shell">
      <TopAppBar pageTitle={pageTitle} onToggleSidebar={toggleSidebar} />
      <div className="app-body">
        <Sidebar
          userEmail={userEmail}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="app-content" style={{ marginLeft: contentMargin }}>
          <div className="app-content-inner">{children}</div>
        </div>
      </div>
      <GlobalAgentLauncher />
    </div>
  );
}

export function AppShellClient({
  children,
  userEmail,
  pageTitle,
}: {
  children: React.ReactNode;
  userEmail: string | null;
  pageTitle?: string;
}) {
  return (
    <UiStoreProvider>
      <AppShellFrame userEmail={userEmail} pageTitle={pageTitle}>
        {children}
      </AppShellFrame>
    </UiStoreProvider>
  );
}
