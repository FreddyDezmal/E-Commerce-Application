import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cartApi } from '../cartApi';
import { ApiError, clearToken, setToken } from '../client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

describe('cartApi', () => {
  beforeEach(() => {
    clearToken();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gets the authenticated user cart', async () => {
    setToken('customer-token');

    const cart = {
      id: 'cart1',
      userId: 'user1',
      items: [],
      subtotal: 0,
    };

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse(cart)
    );

    const result = await cartApi.getCart();

    expect(result).toEqual(cart);

    const [url, init] =
      (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];

    expect(url).toContain('/api/cart');
    expect(init.headers.Authorization).toBe('Bearer customer-token');
  });

  it('adds an item to the cart', async () => {
    setToken('customer-token');

    const cart = {
      id: 'cart1',
      userId: 'user1',
      items: [
        {
          id: 'item1',
          productId: 'product1',
          productName: 'Chair',
          unitPrice: 100,
          quantity: 2,
        },
      ],
      subtotal: 200,
    };

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse(cart, 201)
    );

    const result = await cartApi.addItem({
      productId: 'product1',
      quantity: 2,
    });

    expect(result).toEqual(cart);

    const [url, init] =
      (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];

    expect(url).toContain('/api/cart/items');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer customer-token');

    expect(JSON.parse(init.body)).toEqual({
      productId: 'product1',
      quantity: 2,
    });
  });

  it('updates the quantity of a cart item', async () => {
    setToken('customer-token');

    const cart = {
      id: 'cart1',
      userId: 'user1',
      items: [],
      subtotal: 300,
    };

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse(cart)
    );

    const result = await cartApi.updateItem('product1', {
      quantity: 3,
    });

    expect(result).toEqual(cart);

    const [url, init] =
      (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];

    expect(url).toContain('/api/cart/items/product1');
    expect(init.method).toBe('PUT');
    expect(init.headers.Authorization).toBe('Bearer customer-token');

    expect(JSON.parse(init.body)).toEqual({
      quantity: 3,
    });
  });

  it('removes an item from the cart', async () => {
    setToken('customer-token');

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(null, {
        status: 204,
      })
    );

    const result = await cartApi.removeItem('product1');

    expect(result).toBeUndefined();

    const [url, init] =
      (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];

    expect(url).toContain('/api/cart/items/product1');
    expect(init.method).toBe('DELETE');
    expect(init.headers.Authorization).toBe('Bearer customer-token');
  });

  it('handles a forbidden cart request', async () => {
    setToken('customer-token');

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 403,
          title: 'FORBIDDEN',
          detail: 'Access denied',
        }),
        {
          status: 403,
          headers: {
            'content-type': 'application/problem+json',
          },
        }
      )
    );

    await expect(cartApi.getCart()).rejects.toMatchObject({
      status: 403,
    });
  });

  it('handles an unauthorised cart request', async () => {
    setToken('expired-token');

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 401,
          title: 'UNAUTHORIZED',
          detail: 'Token expired',
        }),
        {
          status: 401,
          headers: {
            'content-type': 'application/problem+json',
          },
        }
      )
    );

    await expect(cartApi.getCart()).rejects.toBeInstanceOf(ApiError);
  });
});
