import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { useCart } from '../context/CartContext';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { toErrorMessage } from '../lib/errorMessage';

export function CheckoutPage() {
  const { cart, isLoading, refresh } = useCart();
  const navigate = useNavigate();
  // Prevents a double-click (or a slow network + impatient user) from
  // firing two POST /api/orders requests for the same cart.
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading && !cart) return <LoadingState label="Loading your cart…" />;
  if (!cart || cart.items.length === 0) {
    return <EmptyState title="Your cart is empty." hint="Add something before checking out." />;
  }

  async function handlePlaceOrder() {
    if (isPlacingOrder) return;
    setIsPlacingOrder(true);
    setError(null);
    try {
      const order = await orderApi.checkout({});
      await refresh();
      navigate(`/orders/${order.id}`, { replace: true, state: { justPlaced: true } });
    } catch (err) {
      setError(toErrorMessage(err));
      setIsPlacingOrder(false);
    }
  }

  return (
    <div className="checkout-page">
      <h1>Review &amp; place order</h1>
      <table className="ledger-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Line total</th>
          </tr>
        </thead>
        <tbody>
          {cart.items.map((item) => (
            <tr key={item.id}>
              <td>{item.productName}</td>
              <td>{item.quantity}</td>
              <td className="numeric">R{(item.unitPrice * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="checkout-total">
        Total (calculated and charged by the server): <strong>R{cart.subtotal.toFixed(2)}</strong>
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="button button--primary"
        disabled={isPlacingOrder}
        onClick={handlePlaceOrder}
      >
        {isPlacingOrder ? 'Placing order…' : 'Place order'}
      </button>
    </div>
  );
}
