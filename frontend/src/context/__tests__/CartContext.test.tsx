import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from '../CartContext';
import { AuthProvider } from '../AuthContext';
import { cartApi } from '../../api/cartApi';
import { userApi } from '../../api/userApi';

vi.mock('../../api/cartApi');
vi.mock('../../api/authApi');
vi.mock('../../api/userApi');

const cart = {
  id: 'c1',
  userId: 'u1',
  items: [{ id: 'i1', productId: 'p1', productName: 'Chair', unitPrice: 10, quantity: 1 }],
  subtotal: 10,
};

function Probe() {
  const { cart, itemCount, isLoading, error, addItem, removeItem } = useCart();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="count">{itemCount}</span>
      <span data-testid="error">{error ?? ''}</span>
      <span data-testid="subtotal">{cart?.subtotal ?? 'none'}</span>
      <button onClick={() => addItem('p1', 1)}>add</button>
      <button onClick={() => removeItem('p1')}>remove</button>
    </div>
  );
}

function renderWithProviders() {
  return render(
    <AuthProvider>
      <CartProvider>
        <Probe />
      </CartProvider>
    </AuthProvider>
  );
}

const authUser = { id: 'u1', email: 'a@b.com', fullName: 'Ada', role: 'customer' as const, createdAt: '' };

describe('CartContext', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('does not fetch a cart when unauthenticated', async () => {
    renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('subtotal')).toHaveTextContent('none'));
    expect(cartApi.getCart).not.toHaveBeenCalled();
  });

  it('loads the cart once authenticated and reflects server-calculated totals', async () => {
    localStorage.setItem('ecommerce.auth.token', 'valid-token');
    vi.mocked(userApi.getMe).mockResolvedValue(authUser);
    vi.mocked(cartApi.getCart).mockResolvedValue(cart);

    renderWithProviders();

    await waitFor(() => expect(screen.getByTestId('subtotal')).toHaveTextContent('10'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('adds an item and takes the returned cart as-is (no client-side price math)', async () => {
    localStorage.setItem('ecommerce.auth.token', 'valid-token');
    vi.mocked(userApi.getMe).mockResolvedValue(authUser);
    vi.mocked(cartApi.getCart).mockResolvedValue({ ...cart, items: [], subtotal: 0 });
    vi.mocked(cartApi.addItem).mockResolvedValue(cart);

    renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('subtotal')).toHaveTextContent('0'));

    await userEvent.click(screen.getByText('add'));

    await waitFor(() => expect(screen.getByTestId('subtotal')).toHaveTextContent('10'));
  });

  it('surfaces a cart load failure as an error state', async () => {
    localStorage.setItem('ecommerce.auth.token', 'valid-token');
    vi.mocked(userApi.getMe).mockResolvedValue(authUser);
    vi.mocked(cartApi.getCart).mockRejectedValue(new Error('Cart unavailable'));

    renderWithProviders();

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Cart unavailable'));
  });
});
