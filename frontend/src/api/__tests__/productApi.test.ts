import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { productApi } from '../productApi';
import { clearToken, setToken } from '../client';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('productApi', () => {
  beforeEach(() => {
    clearToken();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it('fetches the product list without requiring auth', async () => {
    const page = { items: [], total: 0, page: 1, limit: 20 };
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(page));

    const result = await productApi.list({ page: 1, limit: 20 });

    expect(result).toEqual(page);
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('fetches a single product by id', async () => {
    const product = { id: 'p1', name: 'Chair', price: 10, stockQuantity: 5 };
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(product));

    const result = await productApi.getById('p1');

    expect(result).toEqual(product);
    const [url] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/products/p1');
  });

  it('sends an Admin bearer token when creating a product', async () => {
    setToken('admin-token');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ id: 'p2' }, 201)
    );

    await productApi.create({ name: 'Desk', price: 100, stockQuantity: 3 });

    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/products');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer admin-token');
  });

  it('propagates a 403 when a non-admin tries to delete a product', async () => {
    setToken('customer-token');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ status: 403, title: 'FORBIDDEN', detail: 'Admins only' }),
        { status: 403, headers: { 'content-type': 'application/problem+json' } }
      )
    );

    await expect(productApi.deactivate('p1')).rejects.toMatchObject({ status: 403 });
  });
});
