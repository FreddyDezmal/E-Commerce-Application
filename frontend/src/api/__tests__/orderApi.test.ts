import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { orderApi } from '../orderApi';
import { ApiError, clearToken, setToken } from '../client';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('orderApi', () => {
  beforeEach(() => {
    clearToken();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it('creates an order without sending any client-computed prices or totals', async () => {
    setToken('token');
    const order = { id: 'o1', userId: 'u1', status: 'Pending', totalAmount: 20, shippingAddressId: null, createdAt: '', items: [] };
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(order, 201));

    const result = await orderApi.checkout({});

    expect(result).toEqual(order);
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentBody = JSON.parse(init.body);
    expect(sentBody).not.toHaveProperty('totalAmount');
    expect(sentBody).not.toHaveProperty('items');
  });

  it('lists the authenticated user\'s orders', async () => {
    setToken('token');
    const page = { items: [], total: 0, page: 1, limit: 20 };
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(page));

    const result = await orderApi.list();

    expect(result).toEqual(page);
  });

  it('returns 403 when fetching an order that belongs to someone else', async () => {
    setToken('token');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ status: 403, title: 'FORBIDDEN', detail: 'Not your order' }),
        { status: 403, headers: { 'content-type': 'application/problem+json' } }
      )
    );

    await expect(orderApi.getById('someone-elses-order')).rejects.toBeInstanceOf(ApiError);
  });

  it('returns 404 for a nonexistent order id', async () => {
    setToken('token');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ status: 404, title: 'NOT_FOUND', detail: 'Order not found' }),
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    );

    await expect(orderApi.getById('missing')).rejects.toMatchObject({ status: 404 });
  });
});
