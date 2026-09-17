import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../LoginPage';
import { authApi } from '../../api/authApi';
import { cartApi } from '../../api/cartApi';
import { getToken } from '../../api/client';
import { createMockEmptyCart, createMockUser } from '../../test/fixtures';
import { renderWithProviders, signOut } from '../../test/renderWithProviders';
import type { AuthResponse } from '../../types/api';

vi.mock('../../api/authApi');
vi.mock('../../api/userApi');
vi.mock('../../api/cartApi');

function renderLoginPage(route = '/login') {
  vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());
  return renderWithProviders(<LoginPage />, {
    route,
    path: '/login',
    otherRoutes: (
      <>
        <Route path="/" element={<div>home page</div>} />
        <Route path="/cart" element={<div>cart page</div>} />
      </>
    ),
  });
}

describe('LoginPage rendering and accessibility', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('renders the sign-in form with labelled email and password fields', () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('masks the password field so it is not shown in plain text', () => {
    renderLoginPage();

    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });

  it('offers a route to registration for visitors without an account', () => {
    renderLoginPage();

    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute(
      'href',
      '/register'
    );
  });

  it('shows no error before the visitor has tried anything', () => {
    renderLoginPage();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('starts with an enabled submit button', () => {
    renderLoginPage();

    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });
});

describe('LoginPage validation', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('asks for both fields when the form is submitted empty, without calling the API', async () => {
    renderLoginPage();

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter your email and password.');
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('rejects a submission with an email but no password', async () => {
    renderLoginPage();

    await userEvent.type(screen.getByLabelText(/email/i), 'thandi@example.test');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter your email and password.');
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('rejects a submission with a password but no email', async () => {
    renderLoginPage();

    await userEvent.type(screen.getByLabelText(/password/i), 'correct-horse');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter your email and password.');
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('accepts the credentials once both fields are filled in', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      user: createMockUser(),
      token: 'jwt-for-test',
    });
    renderLoginPage();

    await userEvent.type(screen.getByLabelText(/email/i), 'thandi@example.test');
    await userEvent.type(screen.getByLabelText(/password/i), 'correct-horse');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'thandi@example.test',
        password: 'correct-horse',
      })
    );
  });
});

describe('LoginPage submission states', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  async function fillValidCredentials() {
    await userEvent.type(screen.getByLabelText(/email/i), 'thandi@example.test');
    await userEvent.type(screen.getByLabelText(/password/i), 'correct-horse');
  }

  it('shows a submitting state and disables the button while the request is in flight', async () => {
    let resolveLogin: (value: AuthResponse) => void = () => {};
    vi.mocked(authApi.login).mockReturnValue(
      new Promise<AuthResponse>((resolve) => {
        resolveLogin = resolve;
      })
    );

    renderLoginPage();
    await fillValidCredentials();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const button = await screen.findByRole('button', { name: /signing in…/i });
    expect(button).toBeDisabled();

    resolveLogin({ user: createMockUser(), token: 'jwt-for-test' });
    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
  });

  it('does not fire a second request when the button is clicked again mid-flight', async () => {
    let resolveLogin: (value: AuthResponse) => void = () => {};
    vi.mocked(authApi.login).mockReturnValue(
      new Promise<AuthResponse>((resolve) => {
        resolveLogin = resolve;
      })
    );

    renderLoginPage();
    await fillValidCredentials();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await userEvent.click(screen.getByRole('button', { name: /signing in…/i }));

    expect(authApi.login).toHaveBeenCalledTimes(1);

    resolveLogin({ user: createMockUser(), token: 'jwt-for-test' });
    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
  });

  it('signs the visitor in and sends them to the home page on success', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      user: createMockUser(),
      token: 'jwt-for-test',
    });

    renderLoginPage();
    await fillValidCredentials();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
    expect(getToken()).toBe('jwt-for-test');
  });

  it('returns the visitor to the page that sent them to sign in', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      user: createMockUser(),
      token: 'jwt-for-test',
    });
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());

    // ProtectedRoute redirects to /login carrying `state.from`; this is that handoff.
    renderWithProviders(<LoginPage />, {
      route: '/login',
      path: '/login',
      state: { from: { pathname: '/cart' } },
      otherRoutes: (
        <>
          <Route path="/" element={<div>home page</div>} />
          <Route path="/cart" element={<div>cart page</div>} />
        </>
      ),
    });

    await fillValidCredentials();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText('cart page')).toBeInTheDocument());
    expect(screen.queryByText('home page')).not.toBeInTheDocument();
  });
});

describe('LoginPage error handling', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('shows the rejection message from the API and keeps the visitor signed out', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid email or password.'));

    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'thandi@example.test');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(getToken()).toBeNull();
    expect(screen.queryByText('home page')).not.toBeInTheDocument();
  });

  it('re-enables the button after a failure so the visitor can try again', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid email or password.'));

    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'thandi@example.test');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });

  it('lets the visitor correct their details and succeed on a second attempt', async () => {
    vi.mocked(authApi.login)
      .mockRejectedValueOnce(new Error('Invalid email or password.'))
      .mockResolvedValueOnce({ user: createMockUser(), token: 'jwt-for-test' });

    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'thandi@example.test');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await screen.findByRole('alert');

    await userEvent.clear(screen.getByLabelText(/password/i));
    await userEvent.type(screen.getByLabelText(/password/i), 'correct-horse');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
  });

  it('reports an unreachable server rather than failing silently', async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new Error('Could not reach the server. Check your connection and try again.')
    );

    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'thandi@example.test');
    await userEvent.type(screen.getByLabelText(/password/i), 'correct-horse');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);
  });
});
