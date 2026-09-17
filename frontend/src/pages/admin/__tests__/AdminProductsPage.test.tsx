import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminProductsPage } from '../AdminProductsPage';
import { ToastProvider } from '../../../context/ToastContext';
import { productApi } from '../../../api/productApi';
import { categoryApi } from '../../../api/categoryApi';
import {
  createMockCategory,
  createMockPagedResult,
  createMockProduct,
} from '../../../test/fixtures';
import type { PagedResult, Product } from '../../../types/api';

vi.mock('../../../api/productApi');
vi.mock('../../../api/categoryApi');

// AdminProductsPage needs the toast provider (it reports mutations through it)
// but no router or auth: AdminRoute already gates it, and the page itself
// renders no links.
function renderAdminProducts() {
  return render(
    <ToastProvider>
      <AdminProductsPage />
    </ToastProvider>
  );
}

const mug = createMockProduct({ id: 'p-mug', name: 'Ceramic Mug', price: 120, stockQuantity: 5 });

function mockLoadedPage(products: Product[] = [mug]) {
  vi.mocked(productApi.list).mockResolvedValue(createMockPagedResult(products));
  vi.mocked(categoryApi.list).mockResolvedValue([
    createMockCategory({ id: 'c-kitchen', name: 'Kitchen' }),
  ]);
}

async function fillProductForm(
  overrides: { name?: string; price?: string; stock?: string } = {}
) {
  const { name = 'Enamel Bowl', price = '95', stock = '12' } = overrides;
  if (name) await userEvent.type(screen.getByLabelText(/^name$/i), name);
  if (price) await userEvent.type(screen.getByLabelText(/^price$/i), price);
  if (stock) await userEvent.type(screen.getByLabelText(/stock quantity/i), stock);
}

describe('AdminProductsPage loading and error states', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading indicator while products and categories are fetched', () => {
    vi.mocked(productApi.list).mockReturnValue(new Promise<PagedResult<Product>>(() => {}));
    vi.mocked(categoryApi.list).mockResolvedValue([]);

    renderAdminProducts();

    expect(screen.getByText('Loading products…')).toBeInTheDocument();
  });

  it('reports a failed load with a retry action', async () => {
    vi.mocked(productApi.list).mockRejectedValue(new Error('Server error.'));
    vi.mocked(categoryApi.list).mockResolvedValue([]);

    renderAdminProducts();

    expect(await screen.findByRole('alert')).toHaveTextContent('Server error.');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('loads the products when the admin retries', async () => {
    vi.mocked(productApi.list)
      .mockRejectedValueOnce(new Error('Server error.'))
      .mockResolvedValueOnce(createMockPagedResult([mug]));
    vi.mocked(categoryApi.list).mockResolvedValue([]);

    renderAdminProducts();
    await screen.findByRole('alert');

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Ceramic Mug')).toBeInTheDocument();
  });
});

describe('AdminProductsPage product table', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('lists each product with its price and stock', async () => {
    mockLoadedPage();

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    const row = screen.getByText('Ceramic Mug').closest('tr')!;
    expect(within(row).getByText('R120.00')).toBeInTheDocument();
    expect(within(row).getByText('5')).toBeInTheDocument();
  });

  it('hides products the backend has already soft-deleted', async () => {
    mockLoadedPage([
      mug,
      createMockProduct({ id: 'p-gone', name: 'Retired Item', isDeleted: true }),
    ]);

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    expect(screen.queryByText('Retired Item')).not.toBeInTheDocument();
  });

  it('offers the categories returned by the API in the category select', async () => {
    mockLoadedPage();

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    const select = screen.getByLabelText(/category/i);
    expect(within(select).getByRole('option', { name: 'Kitchen' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: /uncategorized/i })).toBeInTheDocument();
  });
});

describe('AdminProductsPage create form validation', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requires a product name before calling the API', async () => {
    mockLoadedPage();

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    await fillProductForm({ name: '' });
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Name is required.');
    expect(productApi.create).not.toHaveBeenCalled();
  });

  // Unlike the auth forms, this form is not marked noValidate, so the browser's
  // own constraint validation (min={0}) blocks submission before the page's
  // handler runs. These two tests assert the outcome the admin actually gets,
  // an invalid field and no request, rather than the page's own error text,
  // which cannot currently be reached through the UI. See the report.
  it('does not submit a negative price to the API', async () => {
    mockLoadedPage();

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    await fillProductForm({ price: '-5' });
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    expect(screen.getByLabelText(/^price$/i)).toBeInvalid();
    expect(productApi.create).not.toHaveBeenCalled();
  });

  it('does not submit a negative stock quantity to the API', async () => {
    mockLoadedPage();

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    await fillProductForm({ stock: '-3' });
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    expect(screen.getByLabelText(/stock quantity/i)).toBeInvalid();
    expect(productApi.create).not.toHaveBeenCalled();
  });

  it('accepts a free product priced at zero', async () => {
    mockLoadedPage();
    vi.mocked(productApi.create).mockResolvedValue(createMockProduct({ price: 0 }));

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    await fillProductForm({ price: '0' });
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() =>
      expect(productApi.create).toHaveBeenCalledWith(expect.objectContaining({ price: 0 }))
    );
  });
});

describe('AdminProductsPage creating a product', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sends the entered values as numbers, not strings', async () => {
    mockLoadedPage();
    vi.mocked(productApi.create).mockResolvedValue(createMockProduct());

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    await fillProductForm({ name: 'Enamel Bowl', price: '95.5', stock: '12' });
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() =>
      expect(productApi.create).toHaveBeenCalledWith({
        name: 'Enamel Bowl',
        description: undefined,
        price: 95.5,
        stockQuantity: 12,
        categoryId: null,
      })
    );
  });

  it('associates the product with the chosen category', async () => {
    mockLoadedPage();
    vi.mocked(productApi.create).mockResolvedValue(createMockProduct());

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    await fillProductForm();
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'c-kitchen');
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() =>
      expect(productApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'c-kitchen' })
      )
    );
  });

  it('confirms the creation and refreshes the product list', async () => {
    mockLoadedPage();
    vi.mocked(productApi.create).mockResolvedValue(createMockProduct({ name: 'Enamel Bowl' }));

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    await fillProductForm();
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    expect(await screen.findByText('Product created.')).toBeInTheDocument();
    await waitFor(() => expect(productApi.list).toHaveBeenCalledTimes(2));
  });

  it('clears the form after a successful creation', async () => {
    mockLoadedPage();
    vi.mocked(productApi.create).mockResolvedValue(createMockProduct());

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    await fillProductForm({ name: 'Enamel Bowl' });
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(screen.getByLabelText(/^name$/i)).toHaveValue(''));
  });

  it('disables the submit button while the creation is in flight', async () => {
    mockLoadedPage();
    let resolveCreate: (value: Product) => void = () => {};
    vi.mocked(productApi.create).mockReturnValue(
      new Promise<Product>((resolve) => {
        resolveCreate = resolve;
      })
    );

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    await fillProductForm();
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    expect(await screen.findByRole('button', { name: /adding…/i })).toBeDisabled();

    resolveCreate(createMockProduct());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add product/i })).toBeEnabled()
    );
  });

  it('shows the backend rejection and keeps the entered values for correction', async () => {
    mockLoadedPage();
    vi.mocked(productApi.create).mockRejectedValue(
      new Error('A product with this name already exists.')
    );

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    await fillProductForm({ name: 'Enamel Bowl' });
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A product with this name already exists.'
    );
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Enamel Bowl');
  });
});

describe('AdminProductsPage deleting a product', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('deactivates the chosen product and refreshes the list', async () => {
    mockLoadedPage();
    vi.mocked(productApi.deactivate).mockResolvedValue(undefined);

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    const row = screen.getByText('Ceramic Mug').closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(productApi.deactivate).toHaveBeenCalledWith('p-mug'));
    expect(await screen.findByText('Product deleted.')).toBeInTheDocument();
  });

  it('reports a failed deletion and leaves the product listed', async () => {
    mockLoadedPage();
    vi.mocked(productApi.deactivate).mockRejectedValue(
      new Error('This operation conflicts with existing data.')
    );

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    const row = screen.getByText('Ceramic Mug').closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: /delete/i }));

    expect(
      await screen.findByText('This operation conflicts with existing data.')
    ).toBeInTheDocument();
    expect(screen.getByText('Ceramic Mug')).toBeInTheDocument();
  });

  it('disables only the row being deleted', async () => {
    mockLoadedPage([
      mug,
      createMockProduct({ id: 'p-bowl', name: 'Enamel Bowl' }),
    ]);
    vi.mocked(productApi.deactivate).mockReturnValue(new Promise<void>(() => {}));

    renderAdminProducts();
    await screen.findByText('Ceramic Mug');

    const mugRow = screen.getByText('Ceramic Mug').closest('tr')!;
    await userEvent.click(within(mugRow).getByRole('button', { name: /delete/i }));

    await waitFor(() =>
      expect(within(mugRow).getByRole('button', { name: /delete/i })).toBeDisabled()
    );
    const bowlRow = screen.getByText('Enamel Bowl').closest('tr')!;
    expect(within(bowlRow).getByRole('button', { name: /delete/i })).toBeEnabled();
  });
});
