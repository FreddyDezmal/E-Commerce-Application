import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userApi } from '../userApi';
import { setToken, clearToken } from '../client';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('userApi', () => {
  beforeEach(() => {
    clearToken();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it('fetches the current profile from /api/users/me', async () => {
    setToken('token');
    const profile = { id: 'u1', email: 'a@b.com', fullName: 'Ada', role: 'Customer', createdAt: '' };
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(profile));

    const result = await userApi.getMe();

    expect(result).toEqual(profile);
    const [url] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/users/me');
  });

  it('updates only the fields the backend allows (fullName)', async () => {
    setToken('token');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ id: 'u1', email: 'a@b.com', fullName: 'New Name', role: 'Customer', createdAt: '' })
    );

    await userApi.updateMe({ fullName: 'New Name' });

    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ fullName: 'New Name' });
  });

  it('surfaces a validation error from the backend', async () => {
    setToken('token');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ status: 400, title: 'VALIDATION_ERROR', detail: 'Full name too long' }),
        { status: 400, headers: { 'content-type': 'application/problem+json' } }
      )
    );

    await expect(userApi.updateMe({ fullName: 'x'.repeat(300) })).rejects.toMatchObject({
      status: 400,
    });
  });
});
