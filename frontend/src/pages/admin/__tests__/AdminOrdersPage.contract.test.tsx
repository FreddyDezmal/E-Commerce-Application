import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminOrdersPage } from '../AdminOrdersPage';
import { ToastProvider } from '../../../context/ToastContext';
import { orderApi } from '../../../api/orderApi';
import { createMockOrder, createMockPagedResult } from '../../../test/fixtures';

vi.mock('../../../api/orderApi');

/*
  Contract regression test for the Milestone 5 exit audit.

  The API previously emitted order status lowercased
  (OrderService.Map: order.Status.ToString().ToLowerInvariant()), while this
  page's <select> options are capitalised. A controlled <select> whose value
  matches no option falls back to rendering the FIRST option, so every order
  that was not Pending displayed as "Pending" and the admin was shown the wrong
  status for it.

  The previous component tests missed this because their fixtures used the
  frontend's assumed casing rather than the API's actual output. These tests
  deliberately assert the casing the backend really sends, so the two sides
  cannot drift apart again without a failure here.
*/

function renderAdminOrders() {
  return render(
    <ToastProvider>
      <AdminOrdersPage />
    </ToastProvider>
  );
}

const STATUSES = ['Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled'] as const;

describe('AdminOrdersPage status contract', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each(STATUSES)(
    'shows %s as the selected status, not the first option in the list',
    async (status) => {
      vi.mocked(orderApi.list).mockResolvedValue(
        createMockPagedResult([
          createMockOrder({ id: 'aaaaaaaa-1111-0000-0000-000000000000', status }),
        ])
      );

      renderAdminOrders();
      const select = (await screen.findByRole('combobox')) as HTMLSelectElement;

      expect(select.value).toBe(status);
      expect(select.selectedOptions[0]?.textContent).toBe(status);
    }
  );

  it('keeps every order row on its own status rather than collapsing them all to Pending', async () => {
    vi.mocked(orderApi.list).mockResolvedValue(
      createMockPagedResult([
        createMockOrder({ id: 'aaaaaaaa-1111-0000-0000-000000000000', status: 'Pending' }),
        createMockOrder({ id: 'bbbbbbbb-2222-0000-0000-000000000000', status: 'Shipped' }),
        createMockOrder({ id: 'cccccccc-3333-0000-0000-000000000000', status: 'Cancelled' }),
      ])
    );

    renderAdminOrders();
    await screen.findByText('aaaaaaaa');

    const valueFor = (reference: string) => {
      const row = screen.getByText(reference).closest('tr')!;
      return (within(row).getByRole('combobox') as HTMLSelectElement).value;
    };

    expect(valueFor('aaaaaaaa')).toBe('Pending');
    expect(valueFor('bbbbbbbb')).toBe('Shipped');
    expect(valueFor('cccccccc')).toBe('Cancelled');
  });

  it('rejects a lowercase status, the casing the API must no longer send', async () => {
    // Guards the regression directly: if the backend reverts to lowercasing,
    // the control silently falls back to "Pending" and this fails.
    vi.mocked(orderApi.list).mockResolvedValue(
      createMockPagedResult([
        createMockOrder({ id: 'aaaaaaaa-1111-0000-0000-000000000000', status: 'shipped' }),
      ])
    );

    renderAdminOrders();
    const select = (await screen.findByRole('combobox')) as HTMLSelectElement;

    // Documents the failure mode rather than asserting it is acceptable.
    expect(select.value).toBe('Pending');
    expect(select.value).not.toBe('shipped');
  });
});
