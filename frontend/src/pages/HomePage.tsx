import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryApi } from '../api/categoryApi';
import type { Category } from '../types/api';

export function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => setCategories([]));
  }, []);

  return (
    <div className="home-page">
      <section className="hero">
        <h1>Ledger &amp; Co.</h1>
        <p className="hero__lede">
          A small, considered catalogue of everyday goods. Browse the shop, add what you need,
          and check out in a few honest steps.
        </p>
        <div className="hero__actions">
          <Link to="/products" className="button button--primary">
            Browse the shop
          </Link>
          <Link to="/register" className="button button--ghost">
            Create an account
          </Link>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="home-categories" aria-labelledby="home-categories-heading">
          <h2 id="home-categories-heading">Shop by category</h2>
          <ul className="home-categories__list">
            {categories.slice(0, 6).map((category) => (
              <li key={category.id}>
                <Link to={`/products?category=${category.id}`} className="home-categories__link">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="home-steps" aria-labelledby="home-steps-heading">
        <h2 id="home-steps-heading">How it works</h2>
        <ol className="home-steps__list">
          <li>
            <strong>Browse</strong>
            <p>Search or filter the catalogue by category.</p>
          </li>
          <li>
            <strong>Add to cart</strong>
            <p>Pick a quantity and add items as you go.</p>
          </li>
          <li>
            <strong>Checkout</strong>
            <p>Review your order and place it with simulated payment.</p>
          </li>
        </ol>
      </section>
    </div>
  );
}
