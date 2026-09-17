import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrdersPage } from '../OrdersPage';
import { orderApi } from '../../api/orderApi';
import { createMockOrder, createMockPagedResult } from '../../test/fixtures';
import type { Order, PagedResult } from '../../types/api';

vi.mock('../../api/orderApi');

function renderOrdersPage() {
  return render(
    <MemoryRouter>
      <OrdersPage />
    </MemoryRouter>
  );
}

describe('OrdersPage loading state', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading indicator while order history is fetched', () => {
    vi.mocked(orderApi.list).mockReturnValue(new Promise<PagedResult<Order>>(() => {}));

    renderOrdersPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading your orders…');
  });

  it('does not render the order table before the data arrives', () => {
    vi.mocked(orderApi.list).mockReturnValue(new Promise<PagedResult<Order>>(() => {}));

    renderOrdersPage();

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('OrdersPage empty state', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('explains that no orders have been placed yet', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(createMockPagedResult<Order>([], { total: 0 }));

    renderOrdersPage();

    expect(await screen.findByText("You haven't placed any orders yet.")).toBeInTheDocument();
    expect(screen.getByText('Your order history will appear here.')).toBeInTheDocument();
  });

  it('renders no table when the history is empty', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(createMockPagedResult<Order>([], { total: 0 }));

    renderOrdersPage();

    await screen.findByText("You haven't placed any orders yet.");
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('OrdersPage error state', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reports a failure to load the history with a retry action', async () => {
    vi.mocked(orderApi.list).mockRejectedValue(new Error('Something went wrong. Please try again.'));

    renderOrdersPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.'
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('loads the history successfully when the customer retries', async () => {
    vi.mocked(orderApi.list)
      .mockRejectedValueOnce(new Error('Something went wrong. Please try again.'))
      .mockResolvedValueOnce(createMockPagedResult([createMockOrder()]));

    renderOrdersPage();
    await screen.findByRole('alert');

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('heading', { name: /order history/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('OrdersPage order list', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders a row per order with its status and total', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(
      createMockPagedResult([
        createMockOrder({
          id: 'aaaaaaaa-1111-0000-0000-000000000000',
          status: 'Shipped',
          totalAmount: 240,
        }),
        createMockOrder({
          id: 'bbbbbbbb-2222-0000-0000-000000000000',
          status: 'Pending',
          totalAmount: 85.5,
        }),
      ])
    );

    renderOrdersPage();

    expect(await screen.findByText('Shipped')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('R240.00')).toBeInTheDocument();
    expect(screen.getByText('R85.50')).toBeInTheDocument();
  });

  it('links each order to its detail route using a shortened reference', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(
      createMockPagedResult([createMockOrder({ id: 'aaaaaaaa-1111-0000-0000-000000000000' })])
    );

    renderOrdersPage();

    const link = await screen.findByRole('link', { name: 'aaaaaaaa' });
    expect(link).toHaveAttribute('href', '/orders/aaaaaaaa-1111-0000-0000-000000000000');
  });

  it('requests the history through the paged API rather than an unbounded fetch', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(createMockPagedResult([createMockOrder()]));

    renderOrdersPage();
    await screen.findByRole('heading', { name: /order history/i });

    expect(orderApi.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 50 }));
  });

  it('shows the order date in a readable form', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(
      createMockPagedResult([createMockOrder({ createdAt: '2026-02-14T10:30:00.000Z' })])
    );

    renderOrdersPage();
    await screen.findByRole('heading', { name: /order history/i });

    const expected = new Date('2026-02-14T10:30:00.000Z').toLocaleDateString();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('labels the history table columns', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(createMockPagedResult([createMockOrder()]));

    renderOrdersPage();

    expect(await screen.findByRole('columnheader', { name: /order/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument();
  });
});
