import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminDashboardPage } from '../AdminDashboardPage';
import { productApi } from '../../../api/productApi';
import { categoryApi } from '../../../api/categoryApi';
import { orderApi } from '../../../api/orderApi';

vi.mock('../../../api/productApi');
vi.mock('../../../api/categoryApi');
vi.mock('../../../api/orderApi');

const order = {
  id: 'order-123',
  userId: 'u1',
  status: 'Pending',
  totalAmount: 250,
  shippingAddressId: null,
  createdAt: '2026-01-01T00:00:00Z',
  items: [],
};

describe('AdminDashboardPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders real counts from the API rather than fabricated statistics', async () => {
    vi.mocked(productApi.list).mockResolvedValue({ items: [], total: 42, page: 1, limit: 1 });
    vi.mocked(categoryApi.list).mockResolvedValue([{ id: 'c1', name: 'Kitchen' }, { id: 'c2', name: 'Office' }]);
    vi.mocked(orderApi.list)
      .mockResolvedValueOnce({ items: [order], total: 7, page: 1, limit: 10 })
      .mockResolvedValueOnce({ items: [], total: 3, page: 1, limit: 1 });

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument());
    expect(screen.getByText('2')).toBeInTheDocument(); // categoryCount
    expect(screen.getByText('7')).toBeInTheDocument(); // orderCount
    expect(screen.getByText('3')).toBeInTheDocument(); // pendingOrderCount
    expect(screen.getByText(order.id.slice(0, 8))).toBeInTheDocument();
  });

  it('shows an error state with retry when the dashboard data fails to load', async () => {
    vi.mocked(productApi.list).mockRejectedValue(new Error('server error'));
    vi.mocked(categoryApi.list).mockResolvedValue([]);
    vi.mocked(orderApi.list).mockResolvedValue({ items: [], total: 0, page: 1, limit: 1 });

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
