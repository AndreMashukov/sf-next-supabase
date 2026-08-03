import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="card stack" style={{ maxWidth: 480, margin: '4rem auto' }}>
      <div>
        <h1>Page not found</h1>
        <p className="muted">The page you requested does not exist or is no longer available.</p>
      </div>
      <Link href="/documents" className="button">
        Back to documents
      </Link>
    </main>
  );
}
