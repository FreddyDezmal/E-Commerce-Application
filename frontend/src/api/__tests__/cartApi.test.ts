import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cartApi } from '../cartApi';
import { ApiError, clearToken, setToken } from '../client';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('cartApi', () => {
  beforeEach(() => {
    clearToken();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it('requires auth to fetch the cart (401 when unauthenticated)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ status: 401, title: 'UNAUTHORIZED', detail: 'Authentication required' }),
        { status: 401, headers: { 'content-type': 'application/problem+json' } }
      )
    );

    await expect(cartApi.get()).rejects.toBeInstanceOf(ApiError);
  });

  it('adds an item and returns the updated cart from the server', async () => {
    setToken('token');
    const cart = { id: 'c1', userId: 'u1', items: [{ id: 'i1', productId: 'p1', productName: 'Chair', unitPrice: 10, quantity: 2 }], subtotal: 20 };
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(cart, 201));

    const result = await cartApi.addItem({ productId: 'p1', quantity: 2 });

    expect(result).toEqual(cart);
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/cart/items');
    expect(JSON.parse(init.body)).toEqual({ productId: 'p1', quantity: 2 });
  });

  it('updates item quantity via PUT', async () => {
    setToken('token');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ id: 'c1', userId: 'u1', items: [], subtotal: 0 })
    );

    await cartApi.updateItem('p1', { quantity: 5 });

    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/cart/items/p1');
    expect(init.method).toBe('PUT');
  });

  it('removes an item and expects a 204 with no body', async () => {
    setToken('token');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(null, { status: 204 }));

    const result = await cartApi.removeItem('p1');

    expect(result).toBeUndefined();
  });
});
