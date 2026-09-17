import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CartPage } from '../CartPage';
import { cartApi } from '../../api/cartApi';
import { createMockCart, createMockCartItem, createMockEmptyCart } from '../../test/fixtures';
import { renderWithProviders, signInAsCustomer, signOut } from '../../test/renderWithProviders';
import type { Cart } from '../../types/api';

vi.mock('../../api/cartApi');
vi.mock('../../api/userApi');
vi.mock('../../api/authApi');

const twoLineCart = createMockCart({
  items: [
    createMockCartItem({
      id: 'ci-1',
      productId: 'p-mug',
      productName: 'Ceramic Mug',
      unitPrice: 120,
      quantity: 2,
    }),
    createMockCartItem({
      id: 'ci-2',
      productId: 'p-notebook',
      productName: 'Linen Notebook',
      unitPrice: 85.5,
      quantity: 1,
    }),
  ],
  subtotal: 325.5,
});

function renderCartPage() {
  signInAsCustomer();
  return renderWithProviders(<CartPage />, {
    route: '/cart',
    path: '/cart',
    otherRoutes: (
      <>
        <Route path="/checkout" element={<div>checkout page</div>} />
        <Route path="/" element={<div>home page</div>} />
      </>
    ),
  });
}

describe('CartPage empty and loading states', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('shows a loading indicator while the cart is being fetched', async () => {
    signInAsCustomer();
    vi.mocked(cartApi.getCart).mockReturnValue(new Promise<Cart>(() => {}));

    renderWithProviders(<CartPage />, { route: '/cart', path: '/cart' });

    // Awaited rather than asserted synchronously: the cart request only starts
    // once AuthProvider has restored the session from the stored token.
    expect(await screen.findByText('Loading cart…')).toBeInTheDocument();
  });

  it('shows the empty-cart message when the server returns no items', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());

    renderCartPage();

    expect(await screen.findByText('Your cart is empty.')).toBeInTheDocument();
    expect(
      screen.getByText('Browse the catalog to find something you like.')
    ).toBeInTheDocument();
  });

  it('offers no checkout action from an empty cart', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());

    renderCartPage();

    await screen.findByText('Your cart is empty.');
    expect(
      screen.queryByRole('button', { name: /proceed to checkout/i })
    ).not.toBeInTheDocument();
  });
});

describe('CartPage error state', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('reports a failed cart load with a retry action', async () => {
    vi.mocked(cartApi.getCart).mockRejectedValue(new Error('Cart is temporarily unavailable.'));

    renderCartPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cart is temporarily unavailable.'
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('recovers and shows the cart when the customer retries successfully', async () => {
    vi.mocked(cartApi.getCart)
      .mockRejectedValueOnce(new Error('Cart is temporarily unavailable.'))
      .mockResolvedValueOnce(twoLineCart);

    renderCartPage();
    await screen.findByRole('alert');

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Ceramic Mug')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('CartPage item rendering', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('lists every line item with its name, unit price and quantity', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(twoLineCart);

    renderCartPage();
    await screen.findByText('Ceramic Mug');

    // Scoped per row: a single-quantity line shows the same figure as its unit
    // price and its line total, so an unscoped text query would be ambiguous.
    const mugRow = screen.getByText('Ceramic Mug').closest('tr')!;
    expect(within(mugRow).getByText('R120.00')).toBeInTheDocument();
    expect(within(mugRow).getByLabelText('Quantity for Ceramic Mug')).toHaveValue(2);

    const notebookRow = screen.getByText('Linen Notebook').closest('tr')!;
    expect(within(notebookRow).getAllByText('R85.50')).toHaveLength(2);
    expect(within(notebookRow).getByLabelText('Quantity for Linen Notebook')).toHaveValue(1);
  });

  it('shows the line total for each row', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(twoLineCart);

    renderCartPage();

    await screen.findByText('Ceramic Mug');
    expect(screen.getByText('R240.00')).toBeInTheDocument();
  });

  it('shows the subtotal the server calculated, not a client-side sum', async () => {
    // The server's subtotal deliberately differs from the sum of the lines:
    // if the page recomputed totals itself this assertion would fail.
    vi.mocked(cartApi.getCart).mockResolvedValue(
      createMockCart({
        items: [createMockCartItem({ unitPrice: 120, quantity: 2 })],
        subtotal: 199.99,
      })
    );

    renderCartPage();

    expect(await screen.findByText('R199.99')).toBeInTheDocument();
  });

  it('gives each quantity input an accessible name naming its product', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(twoLineCart);

    renderCartPage();

    expect(await screen.findByLabelText('Quantity for Ceramic Mug')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity for Linen Notebook')).toBeInTheDocument();
  });
});

describe('CartPage quantity changes', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('sends the new quantity to the cart API when the customer changes it', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(twoLineCart);
    vi.mocked(cartApi.updateItem).mockResolvedValue(twoLineCart);

    renderCartPage();
    const quantity = await screen.findByLabelText('Quantity for Ceramic Mug');

    await userEvent.tripleClick(quantity);
    await userEvent.keyboard('5');

    await waitFor(() =>
      expect(cartApi.updateItem).toHaveBeenCalledWith('p-mug', { quantity: 5 })
    );
  });

  it('shows the subtotal the server returns after a quantity change', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(twoLineCart);
    vi.mocked(cartApi.updateItem).mockResolvedValue(
      createMockCart({ items: twoLineCart.items, subtotal: 565.5 })
    );

    renderCartPage();
    const quantity = await screen.findByLabelText('Quantity for Ceramic Mug');

    await userEvent.tripleClick(quantity);
    await userEvent.keyboard('4');

    expect(await screen.findByText('R565.50')).toBeInTheDocument();
  });

  it('tells the customer when the quantity could not be updated', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(twoLineCart);
    vi.mocked(cartApi.updateItem).mockRejectedValue(new Error('Only 3 left in stock.'));

    renderCartPage();
    const quantity = await screen.findByLabelText('Quantity for Ceramic Mug');

    await userEvent.tripleClick(quantity);
    await userEvent.keyboard('9');

    expect(await screen.findByText('Only 3 left in stock.')).toBeInTheDocument();
  });
});

describe('CartPage item removal', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  function removeButtonFor(productName: string) {
    const row = screen.getByText(productName).closest('tr');
    if (!row) throw new Error(`No cart row found for ${productName}`);
    return within(row).getByRole('button', { name: /remove/i });
  }

  it('removes the chosen line item and refetches the authoritative cart', async () => {
    vi.mocked(cartApi.getCart)
      .mockResolvedValueOnce(twoLineCart)
      .mockResolvedValueOnce(
        createMockCart({ items: [twoLineCart.items[1]], subtotal: 85.5 })
      );
    vi.mocked(cartApi.removeItem).mockResolvedValue(undefined);

    renderCartPage();
    await screen.findByText('Ceramic Mug');

    await userEvent.click(removeButtonFor('Ceramic Mug'));

    await waitFor(() => expect(cartApi.removeItem).toHaveBeenCalledWith('p-mug'));
    await waitFor(() => expect(screen.queryByText('Ceramic Mug')).not.toBeInTheDocument());
    expect(screen.getByText('Linen Notebook')).toBeInTheDocument();
  });

  it('confirms the removal to the customer', async () => {
    vi.mocked(cartApi.getCart)
      .mockResolvedValueOnce(twoLineCart)
      .mockResolvedValueOnce(createMockCart({ items: [twoLineCart.items[1]], subtotal: 85.5 }));
    vi.mocked(cartApi.removeItem).mockResolvedValue(undefined);

    renderCartPage();
    await screen.findByText('Ceramic Mug');

    await userEvent.click(removeButtonFor('Ceramic Mug'));

    expect(await screen.findByText('Item removed from cart.')).toBeInTheDocument();
  });

  it('falls back to the empty state when the last item is removed', async () => {
    vi.mocked(cartApi.getCart)
      .mockResolvedValueOnce(
        createMockCart({ items: [twoLineCart.items[0]], subtotal: 240 })
      )
      .mockResolvedValueOnce(createMockEmptyCart());
    vi.mocked(cartApi.removeItem).mockResolvedValue(undefined);

    renderCartPage();
    await screen.findByText('Ceramic Mug');

    await userEvent.click(removeButtonFor('Ceramic Mug'));

    expect(await screen.findByText('Your cart is empty.')).toBeInTheDocument();
  });

  it('reports a failed removal and leaves the item in the cart', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(twoLineCart);
    vi.mocked(cartApi.removeItem).mockRejectedValue(new Error('Could not remove that item.'));

    renderCartPage();
    await screen.findByText('Ceramic Mug');

    await userEvent.click(removeButtonFor('Ceramic Mug'));

    expect(await screen.findByText('Could not remove that item.')).toBeInTheDocument();
    expect(screen.getByText('Ceramic Mug')).toBeInTheDocument();
  });

  it('disables only the affected row while its request is in flight', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(twoLineCart);
    vi.mocked(cartApi.removeItem).mockReturnValue(new Promise<void>(() => {}));

    renderCartPage();
    await screen.findByText('Ceramic Mug');

    await userEvent.click(removeButtonFor('Ceramic Mug'));

    await waitFor(() => expect(removeButtonFor('Ceramic Mug')).toBeDisabled());
    expect(removeButtonFor('Linen Notebook')).toBeEnabled();
    expect(screen.getByLabelText('Quantity for Linen Notebook')).toBeEnabled();
  });
});

describe('CartPage checkout navigation', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('takes the customer to checkout', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(twoLineCart);

    renderCartPage();
    await screen.findByText('Ceramic Mug');

    await userEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    expect(await screen.findByText('checkout page')).toBeInTheDocument();
  });

  it('offers a way back to continue shopping', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(twoLineCart);

    renderCartPage();

    expect(await screen.findByRole('link', { name: /continue shopping/i })).toHaveAttribute(
      'href',
      '/'
    );
  });
});
