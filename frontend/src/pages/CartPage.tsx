import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { toErrorMessage } from '../lib/errorMessage';

export function CartPage() {
  const { cart, isLoading, error, refresh, updateItem, removeItem } = useCart();
  const { notify } = useToast();
  const navigate = useNavigate();
  // Tracks which single line item has an in-flight request, so we disable
  // just that row's controls instead of freezing the whole cart.
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  async function handleQuantityChange(productId: string, quantity: number) {
    if (quantity < 0) return;
    setPendingProductId(productId);
    try {
      await updateItem(productId, quantity);
    } catch (err) {
      notify(toErrorMessage(err), 'error');
    } finally {
      setPendingProductId(null);
    }
  }

  async function handleRemove(productId: string) {
    setPendingProductId(productId);
    try {
      await removeItem(productId);
      notify('Item removed from cart.');
    } catch (err) {
      notify(toErrorMessage(err), 'error');
    } finally {
      setPendingProductId(null);
    }
  }

  if (isLoading && !cart) return <LoadingState label="Loading cart…" />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState title="Your cart is empty." hint="Browse the catalog to find something you like." />
    );
  }

  return (
    <div className="cart-page">
      <h1>Your cart</h1>
      <table className="ledger-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Unit price</th>
            <th>Quantity</th>
            <th>Line total</th>
            <th aria-label="Remove" />
          </tr>
        </thead>
        <tbody>
          {cart.items.map((item) => {
            const isPending = pendingProductId === item.productId;
            return (
              <tr key={item.id}>
                <td>{item.productName}</td>
                <td className="numeric">R{item.unitPrice.toFixed(2)}</td>
                <td>
                  <input
                    type="number"
                    min={0}
                    value={item.quantity}
                    disabled={isPending}
                    onChange={(e) => handleQuantityChange(item.productId, Number(e.target.value))}
                    aria-label={`Quantity for ${item.productName}`}
                  />
                </td>
                <td className="numeric">R{(item.unitPrice * item.quantity).toFixed(2)}</td>
                <td>
                  <button
                    type="button"
                    className="button button--ghost"
                    disabled={isPending}
                    onClick={() => handleRemove(item.productId)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="cart-summary">
        <p>
          Subtotal (calculated by the server): <strong>R{cart.subtotal.toFixed(2)}</strong>
        </p>
        <button type="button" className="button button--primary" onClick={() => navigate('/checkout')}>
          Proceed to checkout
        </button>
      </div>
      <p className="field-hint">
        <Link to="/">Continue shopping</Link>
      </p>
    </div>
  );
}
