'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setConfirmationRequired(false);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      setConfirmationRequired(true);
      return;
    }

    router.push('/documents');
    router.refresh();
  }

  return (
    <main className="container">
      <div className="card stack" style={{ maxWidth: 480, margin: '4rem auto' }}>
        <div>
          <h1>Create account</h1>
          <p className="muted">Start creating documents and quizzes.</p>
        </div>

        {confirmationRequired ? (
          <div className="stack">
            <p>
              Check your email to confirm your account before signing in.
            </p>
            <p className="muted">
              We sent a confirmation link to <strong>{email}</strong>.
            </p>
            <p className="muted">
              Already confirmed? <Link href="/login">Sign in</Link>
            </p>
          </div>
        ) : (
          <>
            <form className="stack" onSubmit={handleSubmit}>
              <label className="label">
                Email
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>

              <label className="label">
                Password
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                />
              </label>

              {error ? <div className="error">{error}</div> : null}

              <button className="button" type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <p className="muted">
              Already have an account? <Link href="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
