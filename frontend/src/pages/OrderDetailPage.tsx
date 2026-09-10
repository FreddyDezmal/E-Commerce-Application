import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { ApiError } from '../api/client';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { toErrorMessage } from '../lib/errorMessage';
import type { Order } from '../types/api';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const justPlaced = Boolean((location.state as { justPlaced?: boolean } | null)?.justPlaced);

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 401 is handled globally (redirect to login). 403/404 here mean "this
  // order exists but isn't yours" or "no such order" — distinct, useful states.
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  function load() {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    setForbidden(false);
    orderApi
      .getById(id)
      .then(setOrder)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else if (err instanceof ApiError && err.status === 403) setForbidden(true);
        else setError(toErrorMessage(err));
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [id]);

  if (isLoading) return <LoadingState label="Loading order…" />;
  if (notFound) return <ErrorState message="We couldn't find that order." />;
  if (forbidden) return <ErrorState message="You do not have permission to view this order." />;
  if (error || !order) return <ErrorState message={error ?? 'Order not found.'} onRetry={load} />;

  return (
    <div className="order-detail">
      {justPlaced && <p className="confirmation-banner">Order placed successfully.</p>}
      <h1>Order {order.id.slice(0, 8)}</h1>
      <dl className="order-meta">
        <div>
          <dt>Date</dt>
          <dd>{new Date(order.createdAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`status-pill status-pill--${order.status.toLowerCase()}`}>{order.status}</span>
          </dd>
        </div>
      </dl>
      <table className="ledger-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Unit price</th>
            <th>Line total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>{item.productName}</td>
              <td>{item.quantity}</td>
              <td className="numeric">R{item.unitPriceAtPurchase.toFixed(2)}</td>
              <td className="numeric">R{(item.unitPriceAtPurchase * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="checkout-total">
        Total: <strong>R{order.totalAmount.toFixed(2)}</strong>
      </p>
    </div>
  );
}
