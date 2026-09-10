import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import { getToken } from '../../api/client';
import { authApi } from '../../api/authApi';
import { userApi } from '../../api/userApi';

vi.mock('../../api/authApi');
vi.mock('../../api/userApi');

function Probe() {
  const { user, isAuthenticated, login, register, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{isAuthenticated ? 'in' : 'out'}</span>
      <span data-testid="name">{user?.fullName ?? ''}</span>
      <button onClick={() => login({ email: 'a@b.com', password: 'password1' }).catch(() => {})}>
        login
      </button>
      <button
        onClick={() =>
          register({ email: 'a@b.com', password: 'password1', fullName: 'Ada' }).catch(() => {})
        }
      >
        register
      </button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

const user = { id: '1', email: 'a@b.com', fullName: 'Ada Lovelace', role: 'customer' as const, createdAt: '' };

describe('AuthContext', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('logs in on real API success and stores the token', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ user, token: 'jwt-token' });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('in'));
    expect(screen.getByTestId('name')).toHaveTextContent('Ada Lovelace');
    expect(getToken()).toBe('jwt-token');
  });

  it('registers and signs the user in, matching the AuthResponse contract', async () => {
    vi.mocked(authApi.register).mockResolvedValue({ user, token: 'jwt-token-2' });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('register'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('in'));
    expect(getToken()).toBe('jwt-token-2');
  });

  it('surfaces a failed login without setting auth state', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await act(async () => {
      await userEvent.click(screen.getByText('login'));
    });

    expect(screen.getByTestId('status')).toHaveTextContent('out');
    expect(getToken()).toBeNull();
  });

  it('clears state and token on logout', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ user, token: 'jwt-token' });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('in'));

    await userEvent.click(screen.getByText('logout'));

    expect(screen.getByTestId('status')).toHaveTextContent('out');
    expect(getToken()).toBeNull();
  });

  it('restores a session from a stored token on mount, and clears it if invalid', async () => {
    localStorage.setItem('ecommerce.auth.token', 'stale-token');
    vi.mocked(userApi.getMe).mockRejectedValue(new Error('expired'));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('out'));
    expect(getToken()).toBeNull();
  });
});
