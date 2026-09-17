import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductListingPage } from '../ProductListingPage';
import { productApi } from '../../api/productApi';
import { categoryApi } from '../../api/categoryApi';
import { createMockCategory, createMockPagedResult, createMockProduct } from '../../test/fixtures';

vi.mock('../../api/productApi');
vi.mock('../../api/categoryApi');

// The existing ProductListingPage suite covers loading, empty and error states.
// This file covers the interactive half: search, category filtering, pagination
// and the product card content, none of which had tests.

const mug = createMockProduct({ id: 'p-mug', name: 'Ceramic Mug', price: 120, stockQuantity: 5 });
const notebook = createMockProduct({
  id: 'p-notebook',
  name: 'Linen Notebook',
  price: 85.5,
  stockQuantity: 0,
});

function renderListing(route = '/products') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ProductListingPage />
    </MemoryRouter>
  );
}

describe('ProductListingPage product cards', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('links each product card to that product detail route', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(createMockPagedResult([mug]));

    renderListing();

    const link = await screen.findByRole('link', { name: /ceramic mug/i });
    expect(link).toHaveAttribute('href', '/products/p-mug');
  });

  it('shows remaining stock for an available product', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(createMockPagedResult([mug]));

    renderListing();

    expect(await screen.findByText('5 in stock')).toBeInTheDocument();
  });

  it('marks a product with no stock as out of stock', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(createMockPagedResult([notebook]));

    renderListing();

    expect(await screen.findByText('Out of stock')).toBeInTheDocument();
  });

  it('reports the total result count returned by the API', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(
      createMockPagedResult([mug, notebook], { total: 24 })
    );

    renderListing();

    expect(await screen.findByText('24 items')).toBeInTheDocument();
  });

  it('uses a singular count label for a single result', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(createMockPagedResult([mug], { total: 1 }));

    renderListing();

    expect(await screen.findByText('1 item')).toBeInTheDocument();
  });
});

describe('ProductListingPage search', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('exposes the search field through a labelled search landmark', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(createMockPagedResult([mug]));

    renderListing();

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(await screen.findByLabelText(/search products/i)).toBeInTheDocument();
  });

  it('queries the API with the submitted search term', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(createMockPagedResult([mug]));

    renderListing();
    await screen.findByText('Ceramic Mug');

    await userEvent.type(screen.getByLabelText(/search products/i), 'mug');
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() =>
      expect(productApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'mug', page: 1 })
      )
    );
  });

  it('submits the search when the customer presses Enter in the field', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(createMockPagedResult([mug]));

    renderListing();
    await screen.findByText('Ceramic Mug');

    await userEvent.type(screen.getByLabelText(/search products/i), 'notebook{Enter}');

    await waitFor(() =>
      expect(productApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'notebook' })
      )
    );
  });

  it('pre-fills the field from a search already in the URL', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(createMockPagedResult([mug]));

    renderListing('/products?search=mug');

    expect(await screen.findByLabelText(/search products/i)).toHaveValue('mug');
  });

  it('shows the empty state when a search matches nothing', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(createMockPagedResult([], { total: 0 }));

    renderListing('/products?search=xyzzy');

    expect(await screen.findByText('No products match your search.')).toBeInTheDocument();
    expect(
      screen.getByText('Try a different keyword or clear the category filter.')
    ).toBeInTheDocument();
  });
});

describe('ProductListingPage category filtering', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('lists the categories returned by the API as filter controls', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([
      createMockCategory({ id: 'c-kitchen', name: 'Kitchen' }),
      createMockCategory({ id: 'c-office', name: 'Office' }),
    ]);
    vi.mocked(productApi.list).mockResolvedValue(createMockPagedResult([mug]));

    renderListing();

    expect(await screen.findByRole('button', { name: 'Kitchen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Office' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all items/i })).toBeInTheDocument();
  });

  it('refetches scoped to the chosen category', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([
      createMockCategory({ id: 'c-kitchen', name: 'Kitchen' }),
    ]);
    vi.mocked(productApi.list).mockResolvedValue(createMockPagedResult([mug]));

    renderListing();
    await userEvent.click(await screen.findByRole('button', { name: 'Kitchen' }));

    await waitFor(() =>
      expect(productApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: 'c-kitchen' })
      )
    );
  });

  it('clears the category filter when the customer picks all items', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([
      createMockCategory({ id: 'c-kitchen', name: 'Kitchen' }),
    ]);
    vi.mocked(productApi.list).mockResolvedValue(createMockPagedResult([mug]));

    renderListing('/products?category=c-kitchen');
    await userEvent.click(await screen.findByRole('button', { name: /all items/i }));

    await waitFor(() =>
      expect(productApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: undefined })
      )
    );
  });

  it('still renders the catalogue when the category request fails', async () => {
    vi.mocked(categoryApi.list).mockRejectedValue(new Error('categories unavailable'));
    vi.mocked(productApi.list).mockResolvedValue(createMockPagedResult([mug]));

    renderListing();

    expect(await screen.findByText('Ceramic Mug')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all items/i })).toBeInTheDocument();
  });
});

describe('ProductListingPage pagination', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('disables Previous on the first page', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(
      createMockPagedResult([mug], { total: 30, page: 1, limit: 12 })
    );

    renderListing();

    expect(await screen.findByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('reports the current page out of the total derived from the API', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(
      createMockPagedResult([mug], { total: 30, page: 1, limit: 12 })
    );

    renderListing();

    expect(await screen.findByText(/page 1 of 3/i)).toBeInTheDocument();
  });

  it('advances to the next page when the customer asks for it', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(
      createMockPagedResult([mug], { total: 30, page: 1, limit: 12 })
    );

    renderListing();
    await userEvent.click(await screen.findByRole('button', { name: /next/i }));

    await waitFor(() =>
      expect(productApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
    );
  });

  it('disables Next on the final page', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(
      createMockPagedResult([mug], { total: 30, page: 3, limit: 12 })
    );

    renderListing('/products?page=3');

    expect(await screen.findByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('offers no pagination controls when there are no results', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(createMockPagedResult([], { total: 0 }));

    renderListing();

    await screen.findByText('No products match your search.');
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('labels the pagination navigation for assistive technology', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue(
      createMockPagedResult([mug], { total: 30, page: 1, limit: 12 })
    );

    renderListing();

    expect(await screen.findByRole('navigation', { name: /product pages/i })).toBeInTheDocument();
  });
});
