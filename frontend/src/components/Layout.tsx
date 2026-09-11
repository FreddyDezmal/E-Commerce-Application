import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export function Layout() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close the mobile menu on navigation, and return focus to the toggle button so keyboard/screen-reader users aren't left stranded inside a menu that's no longer visible.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  function handleLogout() {
    setIsMenuOpen(false);
    logout();
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__brand">
          <Link to="/" className="brand-mark">
            Ledger &amp; Co.
          </Link>
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className="nav-toggle"
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span className="visually-hidden">{isMenuOpen ? 'Close menu' : 'Open menu'}</span>
          <span aria-hidden="true" className={isMenuOpen ? 'nav-toggle__icon nav-toggle__icon--open' : 'nav-toggle__icon'} />
        </button>

        <div id="primary-navigation" className={isMenuOpen ? 'site-header__collapsible site-header__collapsible--open' : 'site-header__collapsible'}>
          <nav className="site-header__nav" aria-label="Primary">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/products">Shop</NavLink>
            {isAuthenticated && <NavLink to="/orders">Orders</NavLink>}
            {isAdmin && <NavLink to="/admin">Admin</NavLink>}
          </nav>
          <div className="site-header__actions">
            {isAuthenticated ? (
              <>
                <NavLink to="/cart" className="cart-link">
                  Cart
                  {itemCount > 0 && (
                    <span className="cart-badge" aria-label={`${itemCount} item${itemCount === 1 ? '' : 's'} in cart`}>
                      {itemCount}
                    </span>
                  )}
                </NavLink>
                <NavLink to="/profile">{user?.fullName.split(' ')[0] ?? 'Profile'}</NavLink>
                <button type="button" className="button button--ghost" onClick={handleLogout}>
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
        </div>

        {isMenuOpen && (
          <button
            type="button"
            className="nav-scrim"
            aria-label="Dismiss menu"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>SEN371 Project, this is a demo application.</p>
      </footer>
    </div>
  );
}
