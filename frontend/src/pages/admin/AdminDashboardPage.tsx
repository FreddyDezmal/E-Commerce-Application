import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../../api/productApi';
import { categoryApi } from '../../api/categoryApi';
import { orderApi } from '../../api/orderApi';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { toErrorMessage } from '../../lib/errorMessage';
import type { Order } from '../../types/api';

interface DashboardCounts {
  productCount: number;
  categoryCount: number;
  orderCount: number;
  pendingOrderCount: number;
  recentOrders: Order[];
}

// All figures come straight from the real API's `total`/list results,
// nothing here is estimated or fabricated (Milestone 4 §25).
export function AdminDashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    setError(null);
    Promise.all([
      productApi.list({ limit: 1 }),
      categoryApi.list(),
      orderApi.list({ limit: 10 }),
      orderApi.list({ limit: 1, status: 'Pending' }),
    ])
      .then(([products, categories, recentOrders, pendingOrders]) => {
        setCounts({
          productCount: products.total,
          categoryCount: categories.length,
          orderCount: recentOrders.total,
          pendingOrderCount: pendingOrders.total,
          recentOrders: recentOrders.items.slice(0, 5),
        });
      })
      .catch((err) => setError(toErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  if (isLoading) return <LoadingState label="Loading dashboard…" />;
  if (error || !counts) return <ErrorState message={error ?? 'Unable to load dashboard.'} onRetry={load} />;

  return (
    <div className="admin-section">
      <h1>Dashboard</h1>
      <dl className="dashboard-stats">
        <div className="dashboard-stats__card">
          <dt>Products</dt>
          <dd>{counts.productCount}</dd>
          <Link to="/admin/products">Manage products</Link>
        </div>
        <div className="dashboard-stats__card">
          <dt>Categories</dt>
          <dd>{counts.categoryCount}</dd>
          <Link to="/admin/categories">Manage categories</Link>
        </div>
        <div className="dashboard-stats__card">
          <dt>Orders</dt>
          <dd>{counts.orderCount}</dd>
          <Link to="/admin/orders">Manage orders</Link>
        </div>
        <div className="dashboard-stats__card">
          <dt>Pending orders</dt>
          <dd>{counts.pendingOrderCount}</dd>
        </div>
      </dl>

      <h2>Recent orders</h2>
      {counts.recentOrders.length === 0 ? (
        <p className="field-hint">No orders have been placed yet.</p>
      ) : (
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
            {counts.recentOrders.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link to="/admin/orders">{order.id.slice(0, 8)}</Link>
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
      )}
    </div>
  );
}
