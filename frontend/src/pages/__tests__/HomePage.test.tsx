import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '../HomePage';
import { categoryApi } from '../../api/categoryApi';

vi.mock('../../api/categoryApi');

describe('HomePage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the storefront intro and a link into the catalogue', () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /ledger & co\./i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse the shop/i })).toHaveAttribute(
      'href',
      '/products'
    );
  });

  it('shows real categories from the API once loaded, and no fabricated ones', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([
      { id: 'c1', name: 'Kitchen' },
      { id: 'c2', name: 'Stationery' },
    ]);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Kitchen')).toBeInTheDocument());
    expect(screen.getByText('Stationery')).toBeInTheDocument();
  });

  it('does not render a categories section when none exist', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(categoryApi.list).toHaveBeenCalled());
    expect(screen.queryByText('Shop by category')).not.toBeInTheDocument();
  });
});
