import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductListingPage } from '../ProductListingPage';
import { productApi } from '../../api/productApi';
import { categoryApi } from '../../api/categoryApi';

vi.mock('../../api/productApi');
vi.mock('../../api/categoryApi');

const product = {
  id: 'p1',
  name: 'Ceramic Mug',
  description: 'A mug.',
  price: 120,
  stockQuantity: 5,
  categoryId: null,
  isDeleted: false,
  createdAt: '',
};

describe('ProductListingPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state, then real product data from the API', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue({ items: [product], total: 1, page: 1, limit: 12 });

    render(
      <MemoryRouter>
        <ProductListingPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Ceramic Mug')).toBeInTheDocument());
    expect(screen.getByText('R120.00')).toBeInTheDocument();
  });

  it('shows an empty state when no products match', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockResolvedValue({ items: [], total: 0, page: 1, limit: 12 });

    render(
      <MemoryRouter>
        <ProductListingPage />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByText('No products match your search.')).toBeInTheDocument()
    );
  });

  it('shows an error state with a retry action when the API fails', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(productApi.list).mockRejectedValue(new Error('network down'));

    render(
      <MemoryRouter>
        <ProductListingPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
