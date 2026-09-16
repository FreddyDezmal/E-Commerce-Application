import { screen, within } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CheckoutPage } from '../CheckoutPage';
import { cartApi } from '../../api/cartApi';
import { orderApi } from '../../api/orderApi';
import { createMockCart, createMockCartItem, createMockEmptyCart } from '../../test/fixtures';
import { renderWithProviders, signInAsCustomer, signOut } from '../../test/renderWithProviders';
import type { Cart } from '../../types/api';

vi.mock('../../api/cartApi');
vi.mock('../../api/orderApi');
vi.mock('../../api/userApi');
vi.mock('../../api/authApi');

// The existing CheckoutPage suite covers placing an order, the duplicate-submit
// guard and checkout failure. This file covers the states it reaches before the
// customer can place anything: loading, an empty cart, and the order summary.

function renderCheckout() {
  signInAsCustomer();
  return renderWithProviders(<CheckoutPage />, {
    route: '/checkout',
    path: '/checkout',
    otherRoutes: <Route path="/orders/:id" element={<div>order confirmation page</div>} />,
  });
}

describe('CheckoutPage loading state', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('shows a loading indicator while the cart is fetched', async () => {
    vi.mocked(cartApi.getCart).mockReturnValue(new Promise<Cart>(() => {}));

    renderCheckout();

    expect(await screen.findByText('Loading your cart…')).toBeInTheDocument();
  });

  it('offers no place-order action before the cart has loaded', async () => {
    vi.mocked(cartApi.getCart).mockReturnValue(new Promise<Cart>(() => {}));

    renderCheckout();

    await screen.findByText('Loading your cart…');
    expect(screen.queryByRole('button', { name: /place order/i })).not.toBeInTheDocument();
  });
});

describe('CheckoutPage empty cart', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('explains that there is nothing to check out', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());

    renderCheckout();

    expect(await screen.findByText('Your cart is empty.')).toBeInTheDocument();
    expect(screen.getByText('Add something before checking out.')).toBeInTheDocument();
  });

  it('does not let the customer place an order from an empty cart', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());

    renderCheckout();

    await screen.findByText('Your cart is empty.');
    expect(screen.queryByRole('button', { name: /place order/i })).not.toBeInTheDocument();
    expect(orderApi.checkout).not.toHaveBeenCalled();
  });
});

describe('CheckoutPage order summary', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('lists each line item with its quantity and line total', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(
      createMockCart({
        items: [
          createMockCartItem({
            id: 'ci-1',
            productName: 'Ceramic Mug',
            unitPrice: 120,
            quantity: 2,
          }),
        ],
        subtotal: 240,
      })
    );

    renderCheckout();
    await screen.findByText('Ceramic Mug');

    const row = screen.getByText('Ceramic Mug').closest('tr')!;
    expect(within(row).getByText('2')).toBeInTheDocument();
    expect(within(row).getByText('R240.00')).toBeInTheDocument();
  });

  it('shows the total the server calculated rather than a client-side sum', async () => {
    // Subtotal deliberately differs from the sum of the lines: the page must
    // present what the server will actually charge.
    vi.mocked(cartApi.getCart).mockResolvedValue(
      createMockCart({
        items: [createMockCartItem({ unitPrice: 120, quantity: 2 })],
        subtotal: 199.99,
      })
    );

    renderCheckout();

    expect(await screen.findByText('R199.99')).toBeInTheDocument();
  });

  it('makes clear that the server is the one charging the total', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockCart());

    renderCheckout();

    expect(
      await screen.findByText(/total \(calculated and charged by the server\)/i)
    ).toBeInTheDocument();
  });

  it('shows no error before the customer has tried to place the order', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockCart());

    renderCheckout();

    await screen.findByRole('button', { name: /place order/i });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
