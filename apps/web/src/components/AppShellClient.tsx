'use client';

import { useEffect, useState } from 'react';
import type { NavDocument } from '@/lib/data/navigation';
import { Sidebar } from './Sidebar';
import { TopAppBar } from './TopAppBar';

export function AppShellClient({
  children,
  documents,
  userEmail,
  pageTitle,
}: {
  children: React.ReactNode;
  documents: NavDocument[];
  userEmail: string | null;
  pageTitle?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const contentMargin = !isMobile
    ? sidebarOpen
      ? 'var(--sidebar-width)'
      : 'var(--sidebar-collapsed-width)'
    : '0px';

  return (
    <div className="app-shell">
      <TopAppBar
        pageTitle={pageTitle}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
      />
      <div className="app-body">
        <Sidebar
          documents={documents}
          userEmail={userEmail}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="app-content" style={{ marginLeft: contentMargin }}>
          <div className="app-content-inner">{children}</div>
        </div>
      </div>
    </div>
  );
}
