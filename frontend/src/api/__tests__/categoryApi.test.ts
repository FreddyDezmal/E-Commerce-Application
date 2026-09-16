import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { categoryApi } from '../categoryApi';
import { clearToken, setToken } from '../client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

describe('categoryApi', () => {
  beforeEach(() => {
    clearToken();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gets categories without authentication', async () => {
    const categories = [
      {
        id: 'cat1',
        name: 'Furniture',
      },
      {
        id: 'cat2',
        name: 'Electronics',
      },
    ];

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse(categories)
    );

    const result = await categoryApi.list();

    expect(result).toEqual(categories);

    const [url, init] =
      (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];

    expect(url).toContain('/api/categories');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('creates a category using an authenticated request', async () => {
    setToken('admin-token');

    const category = {
      id: 'cat1',
      name: 'Furniture',
    };

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse(category, 201)
    );

    const result = await categoryApi.create({
      name: 'Furniture',
    });

    expect(result).toEqual(category);

    const [url, init] =
      (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];

    expect(url).toContain('/api/categories');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer admin-token');

    expect(JSON.parse(init.body)).toEqual({
      name: 'Furniture',
    });
  });

  it('deletes a category using an authenticated request', async () => {
    setToken('admin-token');

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(null, {
        status: 204,
      })
    );

    const result = await categoryApi.delete('cat1');

    expect(result).toBeUndefined();

    const [url, init] =
      (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];

    expect(url).toContain('/api/categories/cat1');
    expect(init.method).toBe('DELETE');
    expect(init.headers.Authorization).toBe('Bearer admin-token');
  });

  it('handles a forbidden category request', async () => {
    setToken('customer-token');

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 403,
          title: 'FORBIDDEN',
          detail: 'Admins only',
        }),
        {
          status: 403,
          headers: {
            'content-type': 'application/problem+json',
          },
        }
      )
    );

    await expect(
      categoryApi.create({
        name: 'Furniture',
      })
    ).rejects.toMatchObject({
      status: 403,
    });
  });
});
