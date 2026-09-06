import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { productApi } from '../../api/productApi';
import { categoryApi } from '../../api/categoryApi';
import { useToast } from '../../context/ToastContext';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { toErrorMessage } from '../../lib/errorMessage';
import type { Category, PagedResult, Product } from '../../types/api';

const emptyForm = { name: '', description: '', price: '', stockQuantity: '', categoryId: '' };

export function AdminProductsPage() {
  const { notify } = useToast();
  const [products, setProducts] = useState<PagedResult<Product> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    setError(null);
    Promise.all([productApi.list({ limit: 100 }), categoryApi.list()])
      .then(([productResult, categoryResult]) => {
        setProducts(productResult);
        setCategories(categoryResult);
      })
      .catch((err) => setError(toErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    const stockQuantity = Number(form.stockQuantity);
    if (!form.name.trim()) return setFormError('Name is required.');
    if (Number.isNaN(price) || price < 0) return setFormError('Price must be zero or greater.');
    if (Number.isNaN(stockQuantity) || stockQuantity < 0)
      return setFormError('Stock quantity must be zero or greater.');

    setFormError(null);
    setIsSubmitting(true);
    try {
      await productApi.create({
        name: form.name,
        description: form.description || undefined,
        price,
        stockQuantity,
        categoryId: form.categoryId || null,
      });
      setForm(emptyForm);
      notify('Product created.');
      load();
    } catch (err) {
      setFormError(toErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    setPendingId(id);
    try {
      await productApi.deactivate(id);
      notify('Product deleted.');
      load();
    } catch (err) {
      notify(toErrorMessage(err), 'error');
    } finally {
      setPendingId(null);
    }
  }

  if (isLoading) return <LoadingState label="Loading products…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="admin-section">
      <h1>Products</h1>

      <form className="admin-form" onSubmit={handleCreate}>
        <h2>Add a product</h2>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <div className="admin-form__grid">
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            Category
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Price
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </label>
          <label>
            Stock quantity
            <input
              type="number"
              min={0}
              value={form.stockQuantity}
              onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
            />
          </label>
          <label className="admin-form__wide">
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
        </div>
        <button type="submit" className="button button--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add product'}
        </button>
      </form>

      <table className="ledger-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Stock</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {products?.items
            .filter((p) => !p.isDeleted)
            .map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td className="numeric">R{product.price.toFixed(2)}</td>
                <td className="numeric">{product.stockQuantity}</td>
                <td>
                  <button
                    type="button"
                    className="button button--ghost"
                    disabled={pendingId === product.id}
                    onClick={() => handleDeactivate(product.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
