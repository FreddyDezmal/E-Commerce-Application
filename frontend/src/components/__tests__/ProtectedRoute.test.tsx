import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '../ProtectedRoute';
import { AdminRoute } from '../AdminRoute';
import { AuthProvider } from '../../context/AuthContext';
import { userApi } from '../../api/userApi';

vi.mock('../../api/userApi');

function renderAt(path: string, isAdminRoute = false) {
  const Guard = isAdminRoute ? AdminRoute : ProtectedRoute;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route path="/" element={<div>home page</div>} />
          <Route element={<Guard />}>
            <Route path="/secret" element={<div>secret page</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('redirects an unauthenticated user to /login', async () => {
    renderAt('/secret');
    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
  });

  it('renders the protected content for an authenticated user', async () => {
    localStorage.setItem('ecommerce.auth.token', 'valid-token');
    vi.mocked(userApi.getMe).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      fullName: 'Ada',
      role: 'customer',
      createdAt: '',
    });

    renderAt('/secret');
    await waitFor(() => expect(screen.getByText('secret page')).toBeInTheDocument());
  });
});

describe('AdminRoute', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('sends a signed-in Customer away from admin-only routes', async () => {
    localStorage.setItem('ecommerce.auth.token', 'valid-token');
    vi.mocked(userApi.getMe).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      fullName: 'Ada',
      role: 'customer',
      createdAt: '',
    });

    renderAt('/secret', true);
    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
  });

  it('allows an Admin through', async () => {
    localStorage.setItem('ecommerce.auth.token', 'valid-token');
    vi.mocked(userApi.getMe).mockResolvedValue({
      id: 'u1',
      email: 'admin@b.com',
      fullName: 'Ada Admin',
      role: 'admin',
      createdAt: '',
    });

    renderAt('/secret', true);
    await waitFor(() => expect(screen.getByText('secret page')).toBeInTheDocument());
  });
});
