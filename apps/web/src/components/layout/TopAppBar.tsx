'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from '@/mutations';

export function TopAppBar({
  onToggleSidebar,
  pageTitle,
}: {
  onToggleSidebar: () => void;
  pageTitle?: string;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="top-app-bar">
      <div className="top-app-bar-inner">
        <div className="top-app-bar-start">
          <button
            type="button"
            className="icon-button"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <MenuIcon />
          </button>
          <Link href="/documents" className="top-app-bar-brand" aria-label="StudyForge">
            <span className="top-app-bar-brand-icon">SF</span>
            <span className="top-app-bar-brand-title">StudyForge</span>
          </Link>
          {pageTitle ? (
            <span className="muted" style={{ fontSize: '0.8125rem' }}>
              / {pageTitle}
            </span>
          ) : null}
        </div>
        <div className="top-app-bar-end">
          <button type="button" className="button secondary" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
