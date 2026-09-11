import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Layout } from '../Layout';
import { AuthProvider } from '../../context/AuthContext';
import { CartProvider } from '../../context/CartContext';
import { cartApi } from '../../api/cartApi';

vi.mock('../../api/userApi');
vi.mock('../../api/authApi');
vi.mock('../../api/cartApi');

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<div>page content</div>} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Layout mobile navigation', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('has an accessible menu toggle that is closed by default', () => {
    vi.mocked(cartApi.getCart).mockResolvedValue({ id: 'c1', userId: 'guest', items: [], subtotal: 0 });
    renderLayout();

    const toggle = screen.getByRole('button', { name: /open menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the navigation menu and updates the accessible label on click', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue({ id: 'c1', userId: 'guest', items: [], subtotal: 0 });
    renderLayout();
    const user = userEvent.setup();

    const toggle = screen.getByRole('button', { name: /open menu/i });
    await user.click(toggle);

    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('closes the menu on Escape and returns focus to the toggle', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue({ id: 'c1', userId: 'guest', items: [], subtotal: 0 });
    renderLayout();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await user.keyboard('{Escape}');

    const toggle = screen.getByRole('button', { name: /open menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });
});
