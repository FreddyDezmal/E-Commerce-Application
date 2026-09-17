import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfilePage } from '../ProfilePage';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { userApi } from '../../api/userApi';
import { cartApi } from '../../api/cartApi';
import { createMockEmptyCart, createMockUser } from '../../test/fixtures';
import {
  renderWithProviders,
  signInAsAdmin,
  signInAsCustomer,
  signOut,
} from '../../test/renderWithProviders';
import type { User } from '../../types/api';

vi.mock('../../api/userApi');
vi.mock('../../api/authApi');
vi.mock('../../api/cartApi');

// Mounted behind ProtectedRoute exactly as App.tsx nests it. ProfilePage seeds
// its form state from `user` on first render, so it depends on the guard having
// resolved the session before it mounts, rendering it bare would misrepresent it.
function renderProfilePage() {
  vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());
  return renderWithProviders(<ProfilePage />, {
    route: '/profile',
    path: '/profile',
    guard: <ProtectedRoute />,
    otherRoutes: <Route path="/login" element={<div>sign in page</div>} />,
  });
}

describe('ProfilePage rendering', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('shows the signed-in customer details', async () => {
    signInAsCustomer({ fullName: 'Thandi Nkosi', email: 'thandi@example.test' });

    renderProfilePage();

    expect(await screen.findByLabelText(/full name/i)).toHaveValue('Thandi Nkosi');
    expect(screen.getByLabelText(/email/i)).toHaveValue('thandi@example.test');
  });

  it('locks the fields the backend does not let the customer change', async () => {
    signInAsCustomer();

    renderProfilePage();

    expect(await screen.findByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/role/i)).toBeDisabled();
    expect(screen.getByText(/email can't be changed here/i)).toBeInTheDocument();
  });

  it('leaves the full name editable', async () => {
    signInAsCustomer();

    renderProfilePage();

    expect(await screen.findByLabelText(/full name/i)).toBeEnabled();
  });

  it('shows the role the API reported for an admin', async () => {
    signInAsAdmin();

    renderProfilePage();

    expect(await screen.findByLabelText(/role/i)).toHaveValue('admin');
  });

  it('is not reachable at all without a session', async () => {
    // No token stored, so the guard sends the visitor to sign in rather than
    // rendering a profile form with nothing in it.
    renderProfilePage();

    expect(await screen.findByText('sign in page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /your profile/i })).not.toBeInTheDocument();
  });
});

describe('ProfilePage validation', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('refuses an empty full name without calling the API', async () => {
    signInAsCustomer();

    renderProfilePage();
    const fullName = await screen.findByLabelText(/full name/i);

    await userEvent.clear(fullName);
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Full name cannot be empty.');
    expect(userApi.updateMe).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only name as empty', async () => {
    signInAsCustomer();

    renderProfilePage();
    const fullName = await screen.findByLabelText(/full name/i);

    await userEvent.clear(fullName);
    await userEvent.type(fullName, '   ');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Full name cannot be empty.');
    expect(userApi.updateMe).not.toHaveBeenCalled();
  });
});

describe('ProfilePage saving', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('sends only the full name, the one field the update request allows', async () => {
    signInAsCustomer({ fullName: 'Thandi Nkosi' });
    vi.mocked(userApi.updateMe).mockResolvedValue(
      createMockUser({ fullName: 'Thandi M Nkosi' })
    );

    renderProfilePage();
    const fullName = await screen.findByLabelText(/full name/i);

    await userEvent.clear(fullName);
    await userEvent.type(fullName, 'Thandi M Nkosi');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(userApi.updateMe).toHaveBeenCalledWith({ fullName: 'Thandi M Nkosi' })
    );
  });

  it('confirms the save to the customer', async () => {
    signInAsCustomer();
    vi.mocked(userApi.updateMe).mockResolvedValue(createMockUser({ fullName: 'Thandi M Nkosi' }));

    renderProfilePage();
    const fullName = await screen.findByLabelText(/full name/i);

    await userEvent.clear(fullName);
    await userEvent.type(fullName, 'Thandi M Nkosi');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText('Profile updated.')).toBeInTheDocument();
  });

  it('shows a saving state and disables the button while the request is in flight', async () => {
    signInAsCustomer();
    let resolveUpdate: (value: User) => void = () => {};
    vi.mocked(userApi.updateMe).mockReturnValue(
      new Promise<User>((resolve) => {
        resolveUpdate = resolve;
      })
    );

    renderProfilePage();
    const fullName = await screen.findByLabelText(/full name/i);

    await userEvent.clear(fullName);
    await userEvent.type(fullName, 'Thandi M Nkosi');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('button', { name: /saving…/i })).toBeDisabled();

    resolveUpdate(createMockUser({ fullName: 'Thandi M Nkosi' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled()
    );
  });

  it('reports a rejected update and keeps the button usable', async () => {
    signInAsCustomer();
    vi.mocked(userApi.updateMe).mockRejectedValue(
      new Error('Some of the submitted data was invalid.')
    );

    renderProfilePage();
    const fullName = await screen.findByLabelText(/full name/i);

    await userEvent.clear(fullName);
    await userEvent.type(fullName, 'x'.repeat(300));
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Some of the submitted data was invalid.'
    );
    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled();
  });

  it('does not announce success when the save failed', async () => {
    signInAsCustomer();
    vi.mocked(userApi.updateMe).mockRejectedValue(new Error('Something went wrong.'));

    renderProfilePage();
    const fullName = await screen.findByLabelText(/full name/i);

    await userEvent.clear(fullName);
    await userEvent.type(fullName, 'Thandi M Nkosi');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await screen.findByRole('alert');
    expect(screen.queryByText('Profile updated.')).not.toBeInTheDocument();
  });
});
