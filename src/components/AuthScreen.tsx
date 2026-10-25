import { useState, type FormEvent } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Brand } from './Brand';
import { authRedirect, supabase } from '../lib/supabase';
type Mode = 'login' | 'signup' | 'reset';
export function AuthScreen({
  onDemo,
  recovery,
  hasSession,
  finishRecovery,
  authError,
}: {
  onDemo: () => void;
  recovery: boolean;
  hasSession: boolean;
  finishRecovery: () => void;
  authError: string;
}) {
  const [mode, setMode] = useState<Mode>(recovery ? 'reset' : 'login');
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(authError);
  const updating = recovery && hasSession;
  function changeMode(next: Mode) {
    setMode(next);
    setError('');
    setMessage('');
    setPassword('');
    setConfirmation('');
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if ((mode === 'signup' || updating) && password !== confirmation)
        throw new Error('The passwords do not match.');
      if (updating) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        finishRecovery();
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: authRedirect(true),
        });
        if (error) throw error;
        setMessage(
          'If an account exists for this email, you will receive a password reset link. Check your inbox and spam folder.',
        );
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: authRedirect() },
        });
        if (error) throw error;
        setMessage('Check your email to confirm your account, then return here to sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <a className="brand" href="/">
          <Brand />
        </a>
        <div className="story-copy">
          <p className="section-caption">A Parkinson’s care companion</p>
          <h1>
            The days between
            <br />
            visits matter.
          </h1>
          <p>A clear record of sleep, symptoms, and everyday moments. In your words, and theirs.</p>
          <div className="auth-journal-preview" aria-hidden="true">
            <div>
              <span>One day. Two perspectives.</span>
              <span className="paper-rule" />
            </div>
            <p>“I felt rested this morning.”</p>
            <p>“We went for a walk after breakfast.”</p>
            <footer>Notice. Record. Bring it together.</footer>
          </div>
        </div>
        <p className="story-foot">Your experience belongs in the conversation.</p>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <h2>
            {updating
              ? 'Choose a new password'
              : mode === 'signup'
                ? 'Start your notebook'
                : mode === 'reset'
                  ? 'Reset your password'
                  : 'Welcome back'}
          </h2>
          <p className="muted">
            {updating
              ? 'Use at least 12 characters.'
              : mode === 'reset'
                ? 'We’ll email you a link to choose a new password.'
                : 'Sleep, symptoms, and the details you want to remember.'}
          </p>
          {!supabase && (
            <div className="preview-message">
              <strong>Try tendline before connecting an account</strong>
              <p>
                Accounts are not connected yet. Try Demo mode below to explore the full app.
              </p>
            </div>
          )}
          <form onSubmit={submit} className="stack">
            {!updating && (
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
            )}
            {(mode !== 'reset' || updating) && (
              <label>
                Password
                <input
                  type="password"
                  autoComplete={mode === 'signup' || updating ? 'new-password' : 'current-password'}
                  required
                  minLength={mode === 'signup' || updating ? 12 : 1}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}
            {(mode === 'signup' || updating) && (
              <label>
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </label>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="notice" role="status">
                {message}
              </p>
            )}
            <button className="button primary" disabled={busy || !supabase}>
              {busy
                ? 'Please wait…'
                : updating
                  ? 'Save new password'
                  : mode === 'signup'
                    ? 'Create account'
                    : mode === 'reset'
                      ? 'Send reset link'
                      : 'Sign in'}
              <ArrowRight size={18} />
            </button>
          </form>
          {!updating && (
            <div className="auth-links">
              {mode === 'login' ? (
                <>
                  <button onClick={() => changeMode('reset')}>Forgot password?</button>
                  <p>
                    New here?{' '}
                    <button onClick={() => changeMode('signup')}>Create an account</button>
                  </p>
                </>
              ) : (
                <button
                  onClick={() => {
                    finishRecovery();
                    changeMode('login');
                  }}
                >
                  Back to sign in
                </button>
              )}
            </div>
          )}
          <div className="auth-divider">
            <span>Take a look first</span>
          </div>
          <button className="button secondary full" onClick={onDemo}>
            Try Demo mode
          </button>
          <p className="fine-print">
            <ShieldCheck size={16} /> Your account’s notebook is private. Demo mode contains
            fictional notes.
          </p>
        </div>
      </section>
    </div>
  );
}
