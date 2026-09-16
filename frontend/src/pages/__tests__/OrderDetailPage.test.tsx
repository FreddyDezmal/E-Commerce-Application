import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderDetailPage } from '../OrderDetailPage';
import { orderApi } from '../../api/orderApi';
import { ApiError } from '../../api/client';
import { createMockOrder, createMockOrderItem } from '../../test/fixtures';
import type { Order } from '../../types/api';

vi.mock('../../api/orderApi');

const ORDER_ID = 'aaaaaaaa-1111-0000-0000-000000000000';

function renderOrderDetail(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: `/orders/${ORDER_ID}`, state }]}>
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/orders" element={<div>order history page</div>} />
        <Route path="/products" element={<div>catalog page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function apiError(status: number, detail: string) {
  return new ApiError({ status, title: 'Error', detail });
}

describe('OrderDetailPage loading state', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading indicator while the order is fetched', () => {
    vi.mocked(orderApi.getById).mockReturnValue(new Promise<Order>(() => {}));

    renderOrderDetail();

    expect(screen.getByRole('status')).toHaveTextContent('Loading order…');
  });
});

describe('OrderDetailPage order information', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the order reference, status and total from the API', async () => {
    vi.mocked(orderApi.getById).mockResolvedValue(
      createMockOrder({ id: ORDER_ID, status: 'Shipped', totalAmount: 325.5 })
    );

    renderOrderDetail();

    expect(await screen.findByRole('heading', { name: /order aaaaaaaa/i })).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
    expect(screen.getByText('R325.50')).toBeInTheDocument();
  });

  it('lists each order item with the price captured at purchase', async () => {
    vi.mocked(orderApi.getById).mockResolvedValue(
      createMockOrder({
        id: ORDER_ID,
        totalAmount: 325.5,
        items: [
          createMockOrderItem({
            id: 'oi-1',
            productName: 'Ceramic Mug',
            quantity: 2,
            unitPriceAtPurchase: 120,
          }),
          createMockOrderItem({
            id: 'oi-2',
            productName: 'Linen Notebook',
            quantity: 1,
            unitPriceAtPurchase: 85.5,
          }),
        ],
      })
    );

    renderOrderDetail();

    expect(await screen.findByText('Ceramic Mug')).toBeInTheDocument();
    expect(screen.getByText('Linen Notebook')).toBeInTheDocument();
    expect(screen.getByText('R240.00')).toBeInTheDocument();
  });

  it('shows the total the server recorded, not a recalculated one', async () => {
    // Total deliberately differs from the sum of the items: the page must
    // display what the order actually says it was charged.
    vi.mocked(orderApi.getById).mockResolvedValue(
      createMockOrder({
        id: ORDER_ID,
        totalAmount: 199.99,
        items: [createMockOrderItem({ quantity: 2, unitPriceAtPurchase: 120 })],
      })
    );

    renderOrderDetail();

    expect(await screen.findByText('R199.99')).toBeInTheDocument();
  });

  it('labels the order item table columns', async () => {
    vi.mocked(orderApi.getById).mockResolvedValue(createMockOrder({ id: ORDER_ID }));

    renderOrderDetail();

    expect(await screen.findByRole('columnheader', { name: /item/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /quantity/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /unit price/i })).toBeInTheDocument();
  });
});

describe('OrderDetailPage error states', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('says the order could not be found on a 404', async () => {
    vi.mocked(orderApi.getById).mockRejectedValue(apiError(404, 'No such order.'));

    renderOrderDetail();

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't find that order.");
  });

  it('distinguishes another customer order with a permission message on a 403', async () => {
    vi.mocked(orderApi.getById).mockRejectedValue(apiError(403, 'Not yours.'));

    renderOrderDetail();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You do not have permission to view this order.'
    );
  });

  it('offers no retry for a 404, because retrying cannot help', async () => {
    vi.mocked(orderApi.getById).mockRejectedValue(apiError(404, 'No such order.'));

    renderOrderDetail();

    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('offers a retry for a transient server failure', async () => {
    vi.mocked(orderApi.getById).mockRejectedValue(
      new Error('Could not reach the server. Check your connection and try again.')
    );

    renderOrderDetail();

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('loads the order when the customer retries after a transient failure', async () => {
    vi.mocked(orderApi.getById)
      .mockRejectedValueOnce(new Error('Could not reach the server.'))
      .mockResolvedValueOnce(createMockOrder({ id: ORDER_ID }));

    renderOrderDetail();
    await screen.findByRole('alert');

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('heading', { name: /order aaaaaaaa/i })).toBeInTheDocument();
  });
});

describe('OrderDetailPage confirmation after checkout', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows no confirmation banner when the order is opened from history', async () => {
    vi.mocked(orderApi.getById).mockResolvedValue(createMockOrder({ id: ORDER_ID }));

    renderOrderDetail();

    await screen.findByRole('heading', { name: /order aaaaaaaa/i });
    expect(screen.queryByText('Order placed successfully.')).not.toBeInTheDocument();
  });

  it('confirms the order when arriving straight from checkout', async () => {
    vi.mocked(orderApi.getById).mockResolvedValue(
      createMockOrder({ id: ORDER_ID, totalAmount: 325.5 })
    );

    renderOrderDetail({ justPlaced: true });

    expect(await screen.findByText('Order placed successfully.')).toBeInTheDocument();
  });

  it('offers the next steps a customer wants after placing an order', async () => {
    vi.mocked(orderApi.getById).mockResolvedValue(createMockOrder({ id: ORDER_ID }));

    renderOrderDetail({ justPlaced: true });

    expect(await screen.findByRole('link', { name: /view order history/i })).toHaveAttribute(
      'href',
      '/orders'
    );
    expect(screen.getByRole('link', { name: /continue shopping/i })).toHaveAttribute(
      'href',
      '/products'
    );
  });
});
