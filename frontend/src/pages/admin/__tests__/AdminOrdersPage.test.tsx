import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminOrdersPage } from '../AdminOrdersPage';
import { ToastProvider } from '../../../context/ToastContext';
import { orderApi } from '../../../api/orderApi';
import { createMockOrder, createMockPagedResult } from '../../../test/fixtures';
import type { Order, PagedResult } from '../../../types/api';

vi.mock('../../../api/orderApi');

function renderAdminOrders() {
  return render(
    <ToastProvider>
      <AdminOrdersPage />
    </ToastProvider>
  );
}

const pendingOrder = createMockOrder({
  id: 'aaaaaaaa-1111-0000-0000-000000000000',
  status: 'Pending',
  totalAmount: 240,
});
const shippedOrder = createMockOrder({
  id: 'bbbbbbbb-2222-0000-0000-000000000000',
  status: 'Shipped',
  totalAmount: 85.5,
});

describe('AdminOrdersPage loading, empty and error states', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading indicator while orders are fetched', () => {
    vi.mocked(orderApi.list).mockReturnValue(new Promise<PagedResult<Order>>(() => {}));

    renderAdminOrders();

    expect(screen.getByText('Loading orders…')).toBeInTheDocument();
  });

  it('shows an empty state when no orders have been placed', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(createMockPagedResult<Order>([], { total: 0 }));

    renderAdminOrders();

    expect(await screen.findByText('No orders have been placed yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('reports a failed load with a retry action', async () => {
    vi.mocked(orderApi.list).mockRejectedValue(new Error('Server error.'));

    renderAdminOrders();

    expect(await screen.findByRole('alert')).toHaveTextContent('Server error.');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('loads the orders when the admin retries', async () => {
    vi.mocked(orderApi.list)
      .mockRejectedValueOnce(new Error('Server error.'))
      .mockResolvedValueOnce(createMockPagedResult([pendingOrder]));

    renderAdminOrders();
    await screen.findByRole('alert');

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('heading', { name: /all orders/i })).toBeInTheDocument();
  });
});

describe('AdminOrdersPage order listing', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('lists every order with its shortened reference and total', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(
      createMockPagedResult([pendingOrder, shippedOrder])
    );

    renderAdminOrders();

    expect(await screen.findByText('aaaaaaaa')).toBeInTheDocument();
    expect(screen.getByText('bbbbbbbb')).toBeInTheDocument();
    expect(screen.getByText('R240.00')).toBeInTheDocument();
    expect(screen.getByText('R85.50')).toBeInTheDocument();
  });

  it('preselects each order current status in its status control', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(
      createMockPagedResult([pendingOrder, shippedOrder])
    );

    renderAdminOrders();
    await screen.findByText('aaaaaaaa');

    const pendingRow = screen.getByText('aaaaaaaa').closest('tr')!;
    expect(within(pendingRow).getByRole('combobox')).toHaveValue('Pending');

    const shippedRow = screen.getByText('bbbbbbbb').closest('tr')!;
    expect(within(shippedRow).getByRole('combobox')).toHaveValue('Shipped');
  });

  it('offers only the statuses the backend transition endpoint supports', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(createMockPagedResult([pendingOrder]));

    renderAdminOrders();
    await screen.findByText('aaaaaaaa');

    const select = screen.getByRole('combobox');
    const options = within(select)
      .getAllByRole('option')
      .map((option) => option.textContent);

    expect(options).toEqual(['Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled']);
  });

  it('offers no full order editing, only a status transition', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(createMockPagedResult([pendingOrder]));

    renderAdminOrders();
    await screen.findByText('aaaaaaaa');

    expect(screen.queryByRole('button', { name: /edit|delete/i })).not.toBeInTheDocument();
  });

  it('requests a generous page size so the admin sees the whole queue', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(createMockPagedResult([pendingOrder]));

    renderAdminOrders();
    await screen.findByText('aaaaaaaa');

    expect(orderApi.list).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }));
  });
});

describe('AdminOrdersPage status changes', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sends the chosen status for the chosen order', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(createMockPagedResult([pendingOrder]));
    vi.mocked(orderApi.updateStatus).mockResolvedValue(
      createMockOrder({ ...pendingOrder, status: 'Paid' })
    );

    renderAdminOrders();
    await screen.findByText('aaaaaaaa');

    await userEvent.selectOptions(screen.getByRole('combobox'), 'Paid');

    await waitFor(() =>
      expect(orderApi.updateStatus).toHaveBeenCalledWith(
        'aaaaaaaa-1111-0000-0000-000000000000',
        { status: 'Paid' }
      )
    );
  });

  it('confirms the change and reloads the orders', async () => {
    vi.mocked(orderApi.list)
      .mockResolvedValueOnce(createMockPagedResult([pendingOrder]))
      .mockResolvedValueOnce(
        createMockPagedResult([createMockOrder({ ...pendingOrder, status: 'Paid' })])
      );
    vi.mocked(orderApi.updateStatus).mockResolvedValue(
      createMockOrder({ ...pendingOrder, status: 'Paid' })
    );

    renderAdminOrders();
    await screen.findByText('aaaaaaaa');

    await userEvent.selectOptions(screen.getByRole('combobox'), 'Paid');

    expect(await screen.findByText('Order status updated.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Paid'));
  });

  it('reports a rejected transition and keeps the previous status', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(createMockPagedResult([pendingOrder]));
    vi.mocked(orderApi.updateStatus).mockRejectedValue(
      new Error('A delivered order cannot be cancelled.')
    );

    renderAdminOrders();
    await screen.findByText('aaaaaaaa');

    await userEvent.selectOptions(screen.getByRole('combobox'), 'Cancelled');

    expect(
      await screen.findByText('A delivered order cannot be cancelled.')
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Pending'));
  });

  it('disables only the order being updated', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(
      createMockPagedResult([pendingOrder, shippedOrder])
    );
    vi.mocked(orderApi.updateStatus).mockReturnValue(new Promise<Order>(() => {}));

    renderAdminOrders();
    await screen.findByText('aaaaaaaa');

    const pendingRow = screen.getByText('aaaaaaaa').closest('tr')!;
    await userEvent.selectOptions(within(pendingRow).getByRole('combobox'), 'Paid');

    await waitFor(() => expect(within(pendingRow).getByRole('combobox')).toBeDisabled());
    const shippedRow = screen.getByText('bbbbbbbb').closest('tr')!;
    expect(within(shippedRow).getByRole('combobox')).toBeEnabled();
  });
});
