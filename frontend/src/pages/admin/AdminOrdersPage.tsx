import { useEffect, useState } from 'react';
import { orderApi } from '../../api/orderApi';
import { useToast } from '../../context/ToastContext';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { toErrorMessage } from '../../lib/errorMessage';
import type { Order, OrderStatus, PagedResult } from '../../types/api';

// The backend only exposes a status transition (PUT /api/orders/{id}/status),
// not full order editing — the admin UI only offers what the API supports
// (Milestone 3 §26).
const STATUSES: OrderStatus[] = ['Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled'];

export function AdminOrdersPage() {
  const { notify } = useToast();
  const [result, setResult] = useState<PagedResult<Order> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    setError(null);
    orderApi
      .list({ limit: 100 })
      .then(setResult)
      .catch((err) => setError(toErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  async function handleStatusChange(id: string, status: string) {
    setPendingId(id);
    try {
      await orderApi.updateStatus(id, { status });
      notify('Order status updated.');
      load();
    } catch (err) {
      notify(toErrorMessage(err), 'error');
    } finally {
      setPendingId(null);
    }
  }

  if (isLoading) return <LoadingState label="Loading orders…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!result || result.items.length === 0) {
    return <EmptyState title="No orders have been placed yet." />;
  }

  return (
    <div className="admin-section">
      <h1>All orders</h1>
      <table className="ledger-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Date</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((order) => (
            <tr key={order.id}>
              <td>{order.id.slice(0, 8)}</td>
              <td>{new Date(order.createdAt).toLocaleDateString()}</td>
              <td className="numeric">R{order.totalAmount.toFixed(2)}</td>
              <td>
                <select
                  value={order.status}
                  disabled={pendingId === order.id}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
