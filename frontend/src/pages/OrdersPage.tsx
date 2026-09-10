import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { toErrorMessage } from '../lib/errorMessage';
import type { Order, PagedResult } from '../types/api';

export function OrdersPage() {
  const [result, setResult] = useState<PagedResult<Order> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    setError(null);
    orderApi
      .list({ page: 1, limit: 50 })
      .then(setResult)
      .catch((err) => setError(toErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  if (isLoading) return <LoadingState label="Loading your orders…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!result || result.items.length === 0) {
    return <EmptyState title="You haven't placed any orders yet." hint="Your order history will appear here." />;
  }

  return (
    <div className="orders-page">
      <h1>Order history</h1>
      <table className="ledger-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Date</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((order) => (
            <tr key={order.id}>
              <td>
                <Link to={`/orders/${order.id}`}>{order.id.slice(0, 8)}</Link>
              </td>
              <td>{new Date(order.createdAt).toLocaleDateString()}</td>
              <td>
                <span className={`status-pill status-pill--${order.status.toLowerCase()}`}>
                  {order.status}
                </span>
              </td>
              <td className="numeric">R{order.totalAmount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
