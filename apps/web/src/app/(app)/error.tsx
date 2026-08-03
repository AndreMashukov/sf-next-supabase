'use client';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card stack" role="alert">
      <div>
        <h2>Something went wrong</h2>
        <p className="muted">{error.message || 'An unexpected error occurred.'}</p>
      </div>
      <button type="button" className="button secondary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
