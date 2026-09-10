import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productApi } from '../api/productApi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { toErrorMessage } from '../lib/errorMessage';
import type { Product } from '../types/api';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { notify } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    productApi
      .getById(id)
      .then(setProduct)
      .catch((err) => setError(toErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleAddToCart() {
    if (!id) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }
    setIsAdding(true);
    try {
      await addItem(id, quantity);
      notify('Added to cart.');
    } catch (err) {
      notify(toErrorMessage(err), 'error');
    } finally {
      setIsAdding(false);
    }
  }

  if (isLoading) return <LoadingState label="Loading product…" />;
  if (error || !product) return <ErrorState message={error ?? 'Product not found.'} />;

  const outOfStock = product.stockQuantity <= 0;

  return (
    <article className="product-detail">
      <div className="product-detail__info">
        <h1>{product.name}</h1>
        <p className="product-detail__price">R{product.price.toFixed(2)}</p>
        {product.description && <p className="product-detail__description">{product.description}</p>}
        <p className="product-detail__stock">
          {outOfStock ? 'Out of stock' : `${product.stockQuantity} available`}
        </p>

        <div className="product-detail__purchase">
          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            type="number"
            min={1}
            max={Math.max(1, product.stockQuantity)}
            value={quantity}
            disabled={outOfStock}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          />
          <button
            type="button"
            className="button button--primary"
            disabled={outOfStock || isAdding}
            onClick={handleAddToCart}
          >
            {isAdding ? 'Adding…' : 'Add to cart'}
          </button>
        </div>
      </div>
    </article>
  );
}
