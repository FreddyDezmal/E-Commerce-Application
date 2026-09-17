import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Layout } from '../Layout';
import { cartApi } from '../../api/cartApi';
import { createMockCart, createMockCartItem, createMockEmptyCart } from '../../test/fixtures';
import {
  renderWithProviders,
  signInAsAdmin,
  signInAsCustomer,
  signOut,
} from '../../test/renderWithProviders';

vi.mock('../../api/userApi');
vi.mock('../../api/authApi');
vi.mock('../../api/cartApi');

// Layout is the only component that decides which navigation a visitor sees,
// so the role-aware branches here are the frontend's most regression-prone UI.
// (The backend re-checks authorization on every request; these assertions are
// about what the header renders, not about enforcing access.)

function renderLayout(route = '/') {
  return renderWithProviders(<Layout />, {
    route,
    path: '/',
    otherRoutes: (
      <>
        <Route path="/login" element={<div>sign in page</div>} />
        <Route path="/cart" element={<div>cart page</div>} />
      </>
    ),
  });
}

describe('Layout navigation for a signed-out visitor', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('offers sign-in and account-creation controls', async () => {
    renderLayout();

    expect(await screen.findByRole('link', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create account/i })).toBeInTheDocument();
  });

  it('hides the cart, orders and sign-out controls', async () => {
    renderLayout();

    await screen.findByRole('link', { name: /sign in/i });
    expect(screen.queryByRole('link', { name: /^cart/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /orders/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });

  it('still exposes the public catalogue links', async () => {
    renderLayout();

    expect(await screen.findByRole('link', { name: /^home$/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /^shop$/i })).toHaveAttribute('href', '/products');
  });

  it('does not show the admin link', async () => {
    renderLayout();

    await screen.findByRole('link', { name: /sign in/i });
    expect(screen.queryByRole('link', { name: /^admin$/i })).not.toBeInTheDocument();
  });
});

describe('Layout navigation for a signed-in customer', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('swaps the auth links for account controls', async () => {
    signInAsCustomer({ fullName: 'Thandi Nkosi' });
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());

    renderLayout();

    expect(await screen.findByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('greets the customer by first name only', async () => {
    signInAsCustomer({ fullName: 'Thandi Nkosi' });
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());

    renderLayout();

    expect(await screen.findByRole('link', { name: 'Thandi' })).toHaveAttribute('href', '/profile');
  });

  it('shows the orders link but not the admin link', async () => {
    signInAsCustomer();
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());

    renderLayout();

    expect(await screen.findByRole('link', { name: /^orders$/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^admin$/i })).not.toBeInTheDocument();
  });

  it('shows no cart badge while the cart is empty', async () => {
    signInAsCustomer();
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());

    renderLayout();

    await screen.findByRole('button', { name: /sign out/i });
    expect(screen.queryByLabelText(/items? in cart/i)).not.toBeInTheDocument();
  });

  it('counts total quantity in the cart badge, not the number of line items', async () => {
    signInAsCustomer();
    vi.mocked(cartApi.getCart).mockResolvedValue(
      createMockCart({
        items: [
          createMockCartItem({ id: 'ci-1', productId: 'p-1', quantity: 2 }),
          createMockCartItem({ id: 'ci-2', productId: 'p-2', quantity: 3 }),
        ],
        subtotal: 600,
      })
    );

    renderLayout();

    expect(await screen.findByLabelText('5 items in cart')).toHaveTextContent('5');
  });

  it('uses a singular cart label for a single item', async () => {
    signInAsCustomer();
    vi.mocked(cartApi.getCart).mockResolvedValue(
      createMockCart({ items: [createMockCartItem({ quantity: 1 })], subtotal: 120 })
    );

    renderLayout();

    expect(await screen.findByLabelText('1 item in cart')).toBeInTheDocument();
  });

  it('returns the visitor to signed-out navigation after signing out', async () => {
    signInAsCustomer();
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());

    renderLayout();
    const signOutButton = await screen.findByRole('button', { name: /sign out/i });

    await userEvent.click(signOutButton);

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
    );
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });
});

describe('Layout navigation for a signed-in admin', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('reveals the admin link', async () => {
    signInAsAdmin();
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());

    renderLayout();

    expect(await screen.findByRole('link', { name: /^admin$/i })).toHaveAttribute('href', '/admin');
  });

  it('keeps the ordinary customer controls available too', async () => {
    signInAsAdmin();
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());

    renderLayout();

    expect(await screen.findByRole('link', { name: /^orders$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^cart$/i })).toBeInTheDocument();
  });
});

describe('Layout structure', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('renders the routed page inside the main landmark', async () => {
    renderWithProviders(<Layout />, {
      route: '/',
      path: '/',
      otherRoutes: null,
    });

    await waitFor(() => expect(screen.getByRole('main')).toBeInTheDocument());
  });

  it('labels the primary navigation landmark', async () => {
    renderLayout();

    expect(await screen.findByRole('navigation', { name: /primary/i })).toBeInTheDocument();
  });

  it('links the brand mark back to the home page', async () => {
    renderLayout();

    expect(await screen.findByRole('link', { name: /ledger & co\./i })).toHaveAttribute('href', '/');
  });
});
