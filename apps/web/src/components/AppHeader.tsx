'use client';

import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/api';

export function AppHeader({ title }: { title: string }) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="row" style={{ marginBottom: '1.5rem' }}>
      <div>
        <p className="muted" style={{ margin: 0 }}>
          StudyForge Quiz
        </p>
        <h1 style={{ margin: '0.25rem 0 0' }}>{title}</h1>
      </div>
      <button className="button secondary" type="button" onClick={handleSignOut}>
        Sign out
      </button>
    </header>
  );
}
