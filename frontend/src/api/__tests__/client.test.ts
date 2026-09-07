import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiError, NetworkError, clearToken, setToken } from '../client';

describe('apiClient', () => {
  beforeEach(() => {
    clearToken();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('attaches the Authorization header when a token is stored', async () => {
    setToken('abc123');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    await apiClient.get('/api/cart');

    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer abc123');
  });

  it('does not attach an Authorization header for public requests', async () => {
    setToken('abc123');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } })
    );

    await apiClient.get('/api/products', undefined, false);

    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('throws ApiError with the backend ProblemDetails body on failure', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ status: 404, title: 'NOT_FOUND', detail: 'Product not found' }),
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    );

    await expect(apiClient.get('/api/products/missing')).rejects.toMatchObject(
      new ApiError({ status: 404, title: 'NOT_FOUND', detail: 'Product not found' })
    );
  });

  it('clears auth state via the unauthorized handler on a 401', async () => {
    setToken('expired-token');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ status: 401, title: 'UNAUTHORIZED', detail: 'Expired' }), {
        status: 401,
        headers: { 'content-type': 'application/problem+json' },
      })
    );

    await expect(apiClient.get('/api/cart')).rejects.toThrow(ApiError);
  });

  it('wraps a network failure in NetworkError', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiClient.get('/api/products')).rejects.toBeInstanceOf(NetworkError);
  });

  it('builds query strings, skipping empty values', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } })
    );

    await apiClient.get('/api/products', { search: 'chair', category: '' });

    const [url] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('search=chair');
    expect(url).not.toContain('category=');
  });

  it('returns undefined for a 204 No Content response', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(null, { status: 204 }));

    const result = await apiClient.delete('/api/cart/items/some-id');
    expect(result).toBeUndefined();
  });
});
