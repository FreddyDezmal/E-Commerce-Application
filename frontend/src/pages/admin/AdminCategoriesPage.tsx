import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { categoryApi } from '../../api/categoryApi';
import { useToast } from '../../context/ToastContext';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { toErrorMessage } from '../../lib/errorMessage';
import type { Category } from '../../types/api';

export function AdminCategoriesPage() {
  const { notify } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    setError(null);
    categoryApi
      .list()
      .then(setCategories)
      .catch((err) => setError(toErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setFormError('Category name is required.');
    setFormError(null);
    setIsSubmitting(true);
    try {
      await categoryApi.create({ name });
      setName('');
      notify('Category created.');
      load();
    } catch (err) {
      setFormError(toErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setPendingId(id);
    try {
      await categoryApi.delete(id);
      notify('Category deleted.');
      load();
    } catch (err) {
      notify(toErrorMessage(err), 'error');
    } finally {
      setPendingId(null);
    }
  }

  if (isLoading) return <LoadingState label="Loading categories…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="admin-section">
      <h1>Categories</h1>

      <form className="admin-form admin-form--inline" onSubmit={handleCreate}>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <label htmlFor="category-name" className="visually-hidden">
          Category name
        </label>
        <input
          id="category-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
        />
        <button type="submit" className="button button--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add category'}
        </button>
      </form>

      {categories.length === 0 ? (
        <EmptyState title="No categories yet." hint="Add one above to start organizing products." />
      ) : (
        <ul className="chip-list">
          {categories.map((c) => (
            <li key={c.id} className="chip">
              {c.name}
              <button
                type="button"
                aria-label={`Delete ${c.name}`}
                disabled={pendingId === c.id}
                onClick={() => handleDelete(c.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
