// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthScreen } from '../src/components/AuthScreen';
const auth = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock('../src/lib/supabase', () => ({
  supabase: { auth },
  authRedirect: (reset: boolean) => `https://notebook.example/${reset ? '?reset=1' : ''}`,
}));
beforeEach(() => {
  Object.values(auth).forEach((fn) => fn.mockReset().mockResolvedValue({ error: null }));
});
afterEach(cleanup);
const show = (props = {}) =>
  render(
    <AuthScreen
      onDemo={vi.fn()}
      recovery={false}
      hasSession={false}
      finishRecovery={vi.fn()}
      authError=""
      {...props}
    />,
  );
const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
describe('authentication forms', () => {
  it('submits login credentials to the Supabase auth client', async () => {
    show();
    fill('Email address', 'alex@example.com');
    fill('Password', 'existing-password');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() =>
      expect(auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'alex@example.com',
        password: 'existing-password',
      }),
    );
  });
  it('blocks mismatched signup passwords then requests email confirmation', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    fill('Email address', 'alex@example.com');
    fill('Password', 'new-password-123');
    fill('Confirm password', 'wrong-password-123');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByText('The passwords do not match.');
    expect(auth.signUp).not.toHaveBeenCalled();
    fill('Confirm password', 'new-password-123');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() =>
      expect(auth.signUp).toHaveBeenCalledWith({
        email: 'alex@example.com',
        password: 'new-password-123',
        options: { emailRedirectTo: 'https://notebook.example/' },
      }),
    );
    await screen.findByText(/Check your email to confirm/);
  });
  it('requests a reset email with the recovery redirect', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    fill('Email address', 'alex@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    await waitFor(() =>
      expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('alex@example.com', {
        redirectTo: 'https://notebook.example/?reset=1',
      }),
    );
    await screen.findByText(/If an account exists/);
  });
  it('changes a password only from a valid recovery session and exits on success', async () => {
    const finishRecovery = vi.fn();
    show({ recovery: true, hasSession: true, finishRecovery });
    expect(screen.getByRole('heading', { name: 'Choose a new password' })).toBeTruthy();
    fill('Password', 'new-password-123');
    fill('Confirm password', 'new-password-123');
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() =>
      expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-password-123' }),
    );
    await waitFor(() => expect(finishRecovery).toHaveBeenCalledOnce());
  });
  it('shows backend errors and retains the form for retry', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: new Error('Invalid login credentials') });
    show();
    fill('Email address', 'alex@example.com');
    fill('Password', 'wrong');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toContain('Invalid login credentials');
  });
  it('offers a fresh reset email for expired recovery links', () => {
    show({ recovery: true, hasSession: false, authError: 'Email link is invalid or has expired' });
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save new password' })).toBeNull();
  });
});
