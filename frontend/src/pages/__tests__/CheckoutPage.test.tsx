import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CheckoutPage } from '../CheckoutPage';
import { CartProvider } from '../../context/CartContext';
import { AuthProvider } from '../../context/AuthContext';
import { orderApi } from '../../api/orderApi';
import { cartApi } from '../../api/cartApi';
import { userApi } from '../../api/userApi';
import type { Order } from '../../types/api';

vi.mock('../../api/orderApi');
vi.mock('../../api/cartApi');
vi.mock('../../api/userApi');

const cart = {
  id: 'c1',
  userId: 'u1',
  items: [{ id: 'i1', productId: 'p1', productName: 'Chair', unitPrice: 10, quantity: 2 }],
  subtotal: 20,
};

function renderCheckout() {
  localStorage.setItem('ecommerce.auth.token', 'valid-token');
  vi.mocked(userApi.getMe).mockResolvedValue({
    id: 'u1',
    email: 'a@b.com',
    fullName: 'Ada',
    role: 'customer',
    createdAt: '',
  });
  vi.mocked(cartApi.getCart).mockResolvedValue(cart);

  return render(
    <MemoryRouter initialEntries={['/checkout']}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders/:id" element={<div>order confirmation page</div>} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('CheckoutPage', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('places an order using the server-calculated total, not a client-computed one', async () => {
    vi.mocked(orderApi.checkout).mockResolvedValue({
      id: 'order-1',
      userId: 'u1',
      status: 'Pending',
      totalAmount: 20,
      shippingAddressId: null,
      createdAt: '',
      items: [],
    });

    renderCheckout();
    await waitFor(() => expect(screen.getByText('Place order')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Place order'));

    await waitFor(() => expect(screen.getByText('order confirmation page')).toBeInTheDocument());
    expect(orderApi.checkout).toHaveBeenCalledTimes(1);
  });

  it('prevents a duplicate submission from a rapid double-click', async () => {
    let resolveCheckout: (value: Order) => void = () => {};
    vi.mocked(orderApi.checkout).mockReturnValue(
      new Promise<Order>((resolve) => {
        resolveCheckout = resolve;
      })
    );

    renderCheckout();
    await waitFor(() => expect(screen.getByText('Place order')).toBeInTheDocument());

    const button = screen.getByText('Place order');
    await userEvent.click(button);
    // Second click while the first request is still in flight — the button
    // is now disabled and showing "Placing order…", so this must be a no-op.
    await userEvent.click(screen.getByText('Placing order…'));

    expect(orderApi.checkout).toHaveBeenCalledTimes(1);

    resolveCheckout({
      id: 'order-1',
      userId: 'u1',
      status: 'Pending',
      totalAmount: 20,
      shippingAddressId: null,
      createdAt: '',
      items: [],
    });
    await waitFor(() => expect(screen.getByText('order confirmation page')).toBeInTheDocument());
  });

  it('shows an error and re-enables the button when checkout fails', async () => {
    vi.mocked(orderApi.checkout).mockRejectedValue(new Error('Payment declined'));

    renderCheckout();
    await waitFor(() => expect(screen.getByText('Place order')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Place order'));

    await waitFor(() => expect(screen.getByText('Payment declined')).toBeInTheDocument());
    expect(screen.getByText('Place order')).not.toBeDisabled();
  });
});
