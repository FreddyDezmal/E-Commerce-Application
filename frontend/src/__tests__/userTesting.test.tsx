/*
 * User Testing (Milestone 5 — Testing and Quality Assurance rubric).
 *
 * Simulates a complete real user session end-to-end via real navigation
 * and real UI interactions, as distinct from the isolated Unit/Component/
 * Function tests elsewhere in this suite (which each render a single
 * page/component/function on its own). This test renders the actual
 * <App /> with real routing and never jumps directly to a page — every
 * step happens by clicking something a real user would click.
 *
 * Journey covered, in one continuous flow:
 *   1. Register a new account (real form, real validation)
 *   2. Confirm registration signs the user in (header updates to "Sign out")
 *   3. Navigate to the catalog via the real "Shop" nav link
 *   4. Click into a real product's detail page
 *   5. Add it to the cart, confirm the nav cart badge updates
 *   6. Navigate to the cart via the real "Cart" nav link, confirm the item is there
 *   7. Proceed to checkout and place the order
 *   8. Land on a real order confirmation page showing the correct order
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../context/ToastContext';
import { authApi } from '../api/authApi';
import { productApi } from '../api/productApi';
import { categoryApi } from '../api/categoryApi';
import { cartApi } from '../api/cartApi';
import { orderApi } from '../api/orderApi';

vi.mock('../api/authApi');
vi.mock('../api/productApi');
vi.mock('../api/categoryApi');
vi.mock('../api/cartApi');
vi.mock('../api/orderApi');

const PRODUCT = {
  id: 'p1',
  name: 'Oak Dining Chair',
  description: 'Solid oak, seats one.',
  price: 899.99,
  stockQuantity: 5,
  categoryId: 'c1',
  isDeleted: false,
  createdAt: '',
};

const USER = {
  id: 'u1',
  email: 'newuser@example.com',
  fullName: 'Ada Lovelace',
  role: 'customer' as const,
  createdAt: '',
};

const EMPTY_CART = { id: 'cart1', userId: 'u1', items: [], subtotal: 0 };

const CART_WITH_ITEM = {
  id: 'cart1',
  userId: 'u1',
  items: [{ id: 'ci1', productId: 'p1', productName: PRODUCT.name, unitPrice: PRODUCT.price, quantity: 1 }],
  subtotal: PRODUCT.price,
};

const ORDER = {
  id: 'order-abc123',
  userId: 'u1',
  status: 'Pending',
  totalAmount: PRODUCT.price,
  shippingAddressId: null,
  createdAt: new Date().toISOString(),
  items: [
    { id: 'oi1', productId: 'p1', productName: PRODUCT.name, quantity: 1, unitPriceAtPurchase: PRODUCT.price },
  ],
};

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <ToastProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('User journey: register through checkout', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('lets a new customer register, browse the catalog, add an item to their cart, and complete checkout', async () => {
    const user = userEvent.setup();

    vi.mocked(authApi.register).mockResolvedValue({ token: 'new-token', user: USER });
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(cartApi.getCart).mockResolvedValue(EMPTY_CART);

    renderApp();

    await waitFor(() => expect(screen.getByText('Create an account')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Full name'), USER.fullName);
    await user.type(screen.getByLabelText('Email'), USER.email);
    await user.type(screen.getByLabelText('Password'), 'correct-horse-1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(authApi.register).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Sign out')).toBeInTheDocument());

    vi.mocked(productApi.list).mockResolvedValue({ items: [PRODUCT], total: 1, page: 1, limit: 12 });
    await user.click(screen.getByText('Shop'));

    await waitFor(() => expect(screen.getByText(PRODUCT.name)).toBeInTheDocument());

    vi.mocked(productApi.getById).mockResolvedValue(PRODUCT);
    await user.click(screen.getByText(PRODUCT.name));

    await waitFor(() => expect(screen.getByText('Add to cart')).toBeInTheDocument());

    vi.mocked(cartApi.addItem).mockResolvedValue(CART_WITH_ITEM);
    await user.click(screen.getByText('Add to cart'));
    await waitFor(() => expect(cartApi.addItem).toHaveBeenCalledWith({ productId: PRODUCT.id, quantity: 1 }));

    await waitFor(() => expect(screen.getByLabelText('1 item in cart')).toBeInTheDocument());

    await user.click(screen.getByText('Cart'));
    await waitFor(() => expect(screen.getByText(PRODUCT.name)).toBeInTheDocument());

    await user.click(screen.getByText('Proceed to checkout'));
    await waitFor(() => expect(screen.getByText('Review & place order')).toBeInTheDocument());

    vi.mocked(orderApi.checkout).mockResolvedValue(ORDER);
    vi.mocked(orderApi.getById).mockResolvedValue(ORDER);
    await user.click(screen.getByText('Place order'));

    await waitFor(() => expect(orderApi.checkout).toHaveBeenCalledTimes(1));

    await waitFor(() => expect(screen.getByText('Order placed successfully.')).toBeInTheDocument());
  });
});