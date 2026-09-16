import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductDetailPage } from '../ProductDetailPage';
import { productApi } from '../../api/productApi';
import { cartApi } from '../../api/cartApi';
import { createMockCart, createMockEmptyCart, createMockProduct } from '../../test/fixtures';
import { renderWithProviders, signInAsCustomer, signOut } from '../../test/renderWithProviders';
import type { Cart, Product } from '../../types/api';

vi.mock('../../api/productApi');
vi.mock('../../api/cartApi');
vi.mock('../../api/userApi');
vi.mock('../../api/authApi');

function renderProductDetail() {
  return renderWithProviders(<ProductDetailPage />, {
    route: '/products/product-1',
    path: '/products/:id',
    otherRoutes: (
      <>
        <Route path="/login" element={<div>sign in page</div>} />
        <Route path="/cart" element={<div>cart page</div>} />
      </>
    ),
  });
}

describe('ProductDetailPage loading and error states', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('shows a loading indicator before the product arrives', () => {
    vi.mocked(productApi.getById).mockReturnValue(new Promise<Product>(() => {}));

    renderProductDetail();

    // Queried by text, not by role: ToastProvider keeps a permanent
    // role="status" live region mounted, so the role alone is ambiguous here.
    expect(screen.getByText('Loading product…')).toBeInTheDocument();
  });

  it('does not show product details while still loading', () => {
    vi.mocked(productApi.getById).mockReturnValue(new Promise<Product>(() => {}));

    renderProductDetail();

    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
  });

  it('replaces the loading indicator with the product once it resolves', async () => {
    vi.mocked(productApi.getById).mockResolvedValue(createMockProduct());

    renderProductDetail();

    expect(await screen.findByRole('heading', { name: 'Ceramic Mug' })).toBeInTheDocument();
    expect(screen.queryByText('Loading product…')).not.toBeInTheDocument();
  });

  it('shows an error message when the product cannot be fetched', async () => {
    vi.mocked(productApi.getById).mockRejectedValue(
      new Error('The requested resource could not be found.')
    );

    renderProductDetail();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The requested resource could not be found.'
    );
  });

  it('reports an unreachable server rather than rendering an empty product', async () => {
    vi.mocked(productApi.getById).mockRejectedValue(
      new Error('Could not reach the server. Check your connection and try again.')
    );

    renderProductDetail();

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
  });
});

describe('ProductDetailPage product information', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('renders the name, description and rand price from the API', async () => {
    vi.mocked(productApi.getById).mockResolvedValue(
      createMockProduct({ name: 'Ceramic Mug', description: 'A stoneware mug.', price: 249.5 })
    );

    renderProductDetail();

    expect(await screen.findByRole('heading', { name: 'Ceramic Mug' })).toBeInTheDocument();
    expect(screen.getByText('A stoneware mug.')).toBeInTheDocument();
    expect(screen.getByText('R249.50')).toBeInTheDocument();
  });

  it('omits the description paragraph when the product has none', async () => {
    vi.mocked(productApi.getById).mockResolvedValue(
      createMockProduct({ description: null, name: 'Plain Notebook' })
    );

    renderProductDetail();

    await screen.findByRole('heading', { name: 'Plain Notebook' });
    expect(screen.queryByText('A stoneware mug.')).not.toBeInTheDocument();
  });

  it('reports how many units are available when the product is in stock', async () => {
    vi.mocked(productApi.getById).mockResolvedValue(createMockProduct({ stockQuantity: 7 }));

    renderProductDetail();

    expect(await screen.findByText('7 available')).toBeInTheDocument();
  });

  it('reports the product as out of stock when nothing is left', async () => {
    vi.mocked(productApi.getById).mockResolvedValue(createMockProduct({ stockQuantity: 0 }));

    renderProductDetail();

    expect(await screen.findByText('Out of stock')).toBeInTheDocument();
  });
});

describe('ProductDetailPage quantity control', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('starts at a quantity of one', async () => {
    vi.mocked(productApi.getById).mockResolvedValue(createMockProduct());

    renderProductDetail();

    expect(await screen.findByLabelText(/quantity/i)).toHaveValue(1);
  });

  it('caps the quantity input at the available stock', async () => {
    vi.mocked(productApi.getById).mockResolvedValue(createMockProduct({ stockQuantity: 4 }));

    renderProductDetail();

    expect(await screen.findByLabelText(/quantity/i)).toHaveAttribute('max', '4');
  });

  it('lets the customer select the field and type a different quantity', async () => {
    vi.mocked(productApi.getById).mockResolvedValue(createMockProduct({ stockQuantity: 9 }));

    renderProductDetail();
    const quantity = await screen.findByLabelText(/quantity/i);

    // Triple-click selects the existing value, so typing replaces it. This is
    // the interaction that actually works, see the clamping test below.
    await userEvent.tripleClick(quantity);
    await userEvent.keyboard('3');

    expect(quantity).toHaveValue(3);
  });

  it('clamps an emptied quantity field back to one rather than allowing a blank', async () => {
    vi.mocked(productApi.getById).mockResolvedValue(createMockProduct());

    renderProductDetail();
    const quantity = await screen.findByLabelText(/quantity/i);

    await userEvent.clear(quantity);

    expect(quantity).toHaveValue(1);
  });

  it('appends to the clamped 1 when the field is emptied and then typed into', async () => {
    // Documents a known rough edge rather than asserting it is desirable: the
    // controlled input snaps an empty value straight back to 1, so deleting the
    // contents and typing "3" yields 13, not 3. Recorded here so the behaviour
    // cannot change unnoticed. See the component-testing report, Remaining Issues.
    vi.mocked(productApi.getById).mockResolvedValue(createMockProduct({ stockQuantity: 20 }));

    renderProductDetail();
    const quantity = await screen.findByLabelText(/quantity/i);

    await userEvent.clear(quantity);
    await userEvent.type(quantity, '3');

    expect(quantity).toHaveValue(13);
  });

  it('disables the quantity input for an out-of-stock product', async () => {
    vi.mocked(productApi.getById).mockResolvedValue(createMockProduct({ stockQuantity: 0 }));

    renderProductDetail();

    expect(await screen.findByLabelText(/quantity/i)).toBeDisabled();
  });
});

describe('ProductDetailPage add to cart', () => {
  afterEach(() => {
    signOut();
    vi.clearAllMocks();
  });

  it('sends an unauthenticated visitor to sign in instead of calling the cart API', async () => {
    vi.mocked(productApi.getById).mockResolvedValue(createMockProduct());

    renderProductDetail();
    await userEvent.click(await screen.findByRole('button', { name: /add to cart/i }));

    await waitFor(() => expect(screen.getByText('sign in page')).toBeInTheDocument());
    expect(cartApi.addItem).not.toHaveBeenCalled();
  });

  it('adds the chosen quantity for a signed-in customer', async () => {
    signInAsCustomer();
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());
    vi.mocked(cartApi.addItem).mockResolvedValue(createMockCart());
    vi.mocked(productApi.getById).mockResolvedValue(createMockProduct({ stockQuantity: 9 }));

    renderProductDetail();
    const quantity = await screen.findByLabelText(/quantity/i);
    await userEvent.tripleClick(quantity);
    await userEvent.keyboard('3');
    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    await waitFor(() =>
      expect(cartApi.addItem).toHaveBeenCalledWith({ productId: 'product-1', quantity: 3 })
    );
  });

  it('confirms the addition to the customer', async () => {
    signInAsCustomer();
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());
    vi.mocked(cartApi.addItem).mockResolvedValue(createMockCart());
    vi.mocked(productApi.getById).mockResolvedValue(createMockProduct());

    renderProductDetail();
    await userEvent.click(await screen.findByRole('button', { name: /add to cart/i }));

    expect(await screen.findByText('Added to cart.')).toBeInTheDocument();
  });

  it('shows an adding state and blocks a second click while the request is in flight', async () => {
    signInAsCustomer();
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());
    let resolveAdd: (value: Cart) => void = () => {};
    vi.mocked(cartApi.addItem).mockReturnValue(
      new Promise<Cart>((resolve) => {
        resolveAdd = resolve;
      })
    );
    vi.mocked(productApi.getById).mockResolvedValue(createMockProduct());

    renderProductDetail();
    await userEvent.click(await screen.findByRole('button', { name: /add to cart/i }));

    const button = await screen.findByRole('button', { name: /adding…/i });
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(cartApi.addItem).toHaveBeenCalledTimes(1);

    resolveAdd(createMockCart());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add to cart/i })).toBeEnabled()
    );
  });

  it('tells the customer when the item could not be added and leaves them able to retry', async () => {
    signInAsCustomer();
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());
    vi.mocked(cartApi.addItem).mockRejectedValue(new Error('Only 2 left in stock.'));
    vi.mocked(productApi.getById).mockResolvedValue(createMockProduct());

    renderProductDetail();
    await userEvent.click(await screen.findByRole('button', { name: /add to cart/i }));

    expect(await screen.findByText('Only 2 left in stock.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeEnabled();
  });

  it('disables add to cart entirely for an out-of-stock product', async () => {
    signInAsCustomer();
    vi.mocked(cartApi.getCart).mockResolvedValue(createMockEmptyCart());
    vi.mocked(productApi.getById).mockResolvedValue(createMockProduct({ stockQuantity: 0 }));

    renderProductDetail();

    expect(await screen.findByRole('button', { name: /add to cart/i })).toBeDisabled();
  });
});
