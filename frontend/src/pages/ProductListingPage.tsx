import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productApi } from '../api/productApi';
import { categoryApi } from '../api/categoryApi';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { toErrorMessage } from '../lib/errorMessage';
import type { Category, PagedResult, Product } from '../types/api';

const PAGE_SIZE = 12;

export function ProductListingPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1');
  const categoryId = params.get('category') ?? '';
  const search = params.get('search') ?? '';

  const [result, setResult] = useState<PagedResult<Product> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchInput, setSearchInput] = useState(search);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    productApi
      .list({ page, limit: PAGE_SIZE, category: categoryId || undefined, search: search || undefined })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err) => {
        if (!cancelled) setError(toErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, categoryId, search]);

  function updateParams(next: Record<string, string>) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    merged.set('page', next.page ?? '1');
    setParams(merged);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ search: searchInput });
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;

  return (
    <div className="catalog-page">
      <div className="catalog-page__header">
        <h1>Shop all products</h1>
        {result && !isLoading && !error && (
          <p className="catalog-page__count">{result.total} item{result.total === 1 ? '' : 's'}</p>
        )}
      </div>
      <div className="catalog">
      <aside className="catalog__filters">
        <h2>Categories</h2>
        <ul className="filter-list">
          <li>
            <button
              type="button"
              className={categoryId === '' ? 'filter-list__item filter-list__item--active' : 'filter-list__item'}
              onClick={() => updateParams({ category: '' })}
            >
              All items
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={
                  categoryId === c.id ? 'filter-list__item filter-list__item--active' : 'filter-list__item'
                }
                onClick={() => updateParams({ category: c.id })}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="catalog__content">
        <form className="search-bar" onSubmit={handleSearchSubmit} role="search">
          <label htmlFor="product-search" className="visually-hidden">
            Search products
          </label>
          <input
            id="product-search"
            type="search"
            placeholder="Search the catalog…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="button button--primary">
            Search
          </button>
        </form>

        {isLoading && <LoadingState label="Loading products…" />}
        {!isLoading && error && (
          <ErrorState message={error} onRetry={() => updateParams({ page: String(page) })} />
        )}
        {!isLoading && !error && result && result.items.length === 0 && (
          <EmptyState
            title="No products match your search."
            hint="Try a different keyword or clear the category filter."
          />
        )}
        {!isLoading && !error && result && result.items.length > 0 && (
          <>
            <ul className="product-grid">
              {result.items.map((product) => (
                <li key={product.id} className="product-card">
                  <Link to={`/products/${product.id}`} className="product-card__link">
                    <span className="product-card__image" aria-hidden="true">
                      {product.name.charAt(0).toUpperCase()}
                    </span>
                    <h3>{product.name}</h3>
                    <p className="product-card__price">R{product.price.toFixed(2)}</p>
                    <p className="product-card__stock">
                      {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <nav className="pagination" aria-label="Product pages">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Next
              </button>
            </nav>
          </>
        )}
      </section>
      </div>
    </div>
  );
}
