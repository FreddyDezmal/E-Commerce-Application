import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../context/ToastContext';
import { clearToken, setToken } from '../api/client';
import { userApi } from '../api/userApi';
import type { User } from '../types/api';
import { createMockAdminUser, createMockUser } from './fixtures';

interface RenderOptions {
  /** URL the router starts on. Defaults to '/'. */
  route?: string;
  /** Route pattern the component is mounted at. Defaults to `route`. */
  path?: string;
  /**
   * Router location state for the initial entry, e.g. the `{ from }` that
   * ProtectedRoute hands to /login so it can send the user back afterwards.
   */
  state?: unknown;
  /**
   * Extra <Route> elements, so a test can assert that an interaction
   * navigated somewhere without stubbing out the router.
   */
  otherRoutes?: ReactNode;
}

/**
 * Renders a component inside the same provider stack and router that main.tsx
 * uses, so tests exercise the real auth/cart/toast wiring rather than a
 * test-only substitute.
 *
 * Files that render an authenticated component must `vi.mock` the api modules
 * those components reach (at minimum '../../api/userApi', plus '../../api/cartApi'
 * whenever CartProvider will fetch).
 */
export function renderWithProviders(ui: ReactNode, options: RenderOptions = {}) {
  const { route = '/', path = route, state, otherRoutes } = options;

  return render(
    <MemoryRouter initialEntries={[{ pathname: route, state }]}>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <Routes>
              <Route path={path} element={ui} />
              {otherRoutes}
            </Routes>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

/**
 * Puts a token in storage and makes GET /api/users/me resolve to `user`, which
 * is exactly how the real AuthProvider restores a session on mount. Call it
 * before rendering. Requires the calling file to have mocked '../../api/userApi'.
 */
export function signInAs(user: User): User {
  setToken('test-token-not-a-real-jwt');
  vi.mocked(userApi.getMe).mockResolvedValue(user);
  return user;
}

export function signInAsCustomer(overrides: Partial<User> = {}): User {
  return signInAs(createMockUser(overrides));
}

export function signInAsAdmin(overrides: Partial<User> = {}): User {
  return signInAs(createMockAdminUser(overrides));
}

/** Leaves the app in a signed-out state. Safe to call when already signed out. */
export function signOut(): void {
  clearToken();
}
