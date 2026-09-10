import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export function Layout() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__brand">
          <Link to="/" className="brand-mark">
            Ledger &amp; Co.
          </Link>
        </div>
        <nav className="site-header__nav" aria-label="Primary">
          <NavLink to="/" end>
            Catalog
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/orders">Orders</NavLink>
          )}
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="site-header__actions">
          {isAuthenticated ? (
            <>
              <NavLink to="/cart" className="cart-link">
                Cart
                {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
              </NavLink>
              <NavLink to="/profile">{user?.fullName.split(' ')[0] ?? 'Profile'}</NavLink>
              <button type="button" className="button button--ghost" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Sign in</NavLink>
              <NavLink to="/register" className="button button--primary">
                Create account
              </NavLink>
            </>
          )}
        </div>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>SEN371 — Milestone 3 demo storefront. Not a real store.</p>
      </footer>
    </div>
  );
}
