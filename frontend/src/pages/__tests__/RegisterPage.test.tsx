import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegisterPage } from '../RegisterPage';
import { authApi } from '../../api/authApi';
import { cartApi } from '../../api/cartApi';
import { getToken } from '../../api/client';
import { createMockEmptyCart, createMockUser } from '../../test/fixtures';
import { renderWithProviders, signOut } from '../../test/renderWithProviders';
import type { AuthResponse } from '../../types/api';

vi.mock('../../api/authApi');
vi.mock('../../api/userApi');
vi.mock('../../api/cartApi');

function renderRegisterPage() {
  vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());
  return renderWithProviders(<RegisterPage />, {
    route: '/register',
    path: '/register',
    otherRoutes: <Route path="/" element={<div>home page</div>} />,
  });
}

async function fillRegistrationForm(
  overrides: { fullName?: string; email?: string; password?: string } = {}
) {
  const {
    fullName = 'Thandi Nkosi',
    email = 'thandi@example.test',
    password = 'correct-horse-9',
  } = overrides;

  if (fullName) await userEvent.type(screen.getByLabelText(/full name/i), fullName);
  if (email) await userEvent.type(screen.getByLabelText(/email/i), email);
  if (password) await userEvent.type(screen.getByLabelText(/password/i), password);
}

describe('RegisterPage rendering and accessibility', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('renders every field the registration request needs, each with a label', () => {
    renderRegisterPage();

    expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('states the password requirement up front rather than only after a failure', () => {
    renderRegisterPage();

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('masks the password field', () => {
    renderRegisterPage();

    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });

  it('offers a route to sign in for visitors who already have an account', () => {
    renderRegisterPage();

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });
});

describe('RegisterPage validation', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('requires a full name before submitting anything to the API', async () => {
    renderRegisterPage();

    await fillRegistrationForm({ fullName: '' });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter your full name.');
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only name as missing', async () => {
    renderRegisterPage();

    await fillRegistrationForm({ fullName: '   ' });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter your full name.');
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('rejects an email address with no domain', async () => {
    renderRegisterPage();

    await fillRegistrationForm({ email: 'thandi@example' });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.');
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('rejects an email address with no @ sign', async () => {
    renderRegisterPage();

    await fillRegistrationForm({ email: 'thandi.example.test' });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.');
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('rejects a password shorter than eight characters', async () => {
    renderRegisterPage();

    await fillRegistrationForm({ password: 'short7' });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Password must be at least 8 characters.'
    );
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('accepts a password of exactly eight characters', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      user: createMockUser(),
      token: 'jwt-for-test',
    });
    renderRegisterPage();

    await fillRegistrationForm({ password: 'eight888' });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(authApi.register).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'eight888' })
      )
    );
  });

  it('reports the first problem only, so the visitor is not overwhelmed', async () => {
    renderRegisterPage();

    // Every field is wrong; the name check runs first.
    await fillRegistrationForm({ fullName: '', email: 'nope', password: 'x' });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Enter your full name.');
    expect(alert).not.toHaveTextContent('Enter a valid email address.');
  });

  it('sends exactly the fields the register request defines when the form is valid', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      user: createMockUser(),
      token: 'jwt-for-test',
    });
    renderRegisterPage();

    await fillRegistrationForm();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(authApi.register).toHaveBeenCalledWith({
        fullName: 'Thandi Nkosi',
        email: 'thandi@example.test',
        password: 'correct-horse-9',
      })
    );
  });
});

describe('RegisterPage submission states', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('shows a creating state and disables the button while the request is in flight', async () => {
    let resolveRegister: (value: AuthResponse) => void = () => {};
    vi.mocked(authApi.register).mockReturnValue(
      new Promise<AuthResponse>((resolve) => {
        resolveRegister = resolve;
      })
    );

    renderRegisterPage();
    await fillRegistrationForm();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('button', { name: /creating account…/i })).toBeDisabled();

    resolveRegister({ user: createMockUser(), token: 'jwt-for-test' });
    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
  });

  it('does not create a second account when the button is clicked again mid-flight', async () => {
    let resolveRegister: (value: AuthResponse) => void = () => {};
    vi.mocked(authApi.register).mockReturnValue(
      new Promise<AuthResponse>((resolve) => {
        resolveRegister = resolve;
      })
    );

    renderRegisterPage();
    await fillRegistrationForm();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await userEvent.click(screen.getByRole('button', { name: /creating account…/i }));

    expect(authApi.register).toHaveBeenCalledTimes(1);

    resolveRegister({ user: createMockUser(), token: 'jwt-for-test' });
    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
  });

  it('signs the new account in immediately and lands on the home page', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      user: createMockUser(),
      token: 'jwt-for-new-account',
    });

    renderRegisterPage();
    await fillRegistrationForm();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
    expect(getToken()).toBe('jwt-for-new-account');
  });
});

describe('RegisterPage error handling', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('surfaces a duplicate-email rejection from the backend', async () => {
    vi.mocked(authApi.register).mockRejectedValue(
      new Error('An account with this email already exists.')
    );

    renderRegisterPage();
    await fillRegistrationForm();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists.'
    );
    expect(getToken()).toBeNull();
  });

  it('re-enables the button after a failure so the visitor can try again', async () => {
    vi.mocked(authApi.register).mockRejectedValue(new Error('Some of the submitted data was invalid.'));

    renderRegisterPage();
    await fillRegistrationForm();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled();
  });

  it('clears a stale validation error once the corrected form is submitted', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      user: createMockUser(),
      token: 'jwt-for-test',
    });

    renderRegisterPage();
    await fillRegistrationForm({ password: 'short' });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await screen.findByRole('alert');

    await userEvent.clear(screen.getByLabelText(/password/i));
    await userEvent.type(screen.getByLabelText(/password/i), 'correct-horse-9');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
  });
});
