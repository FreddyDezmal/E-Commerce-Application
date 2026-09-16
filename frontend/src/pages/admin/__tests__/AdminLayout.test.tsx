import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AdminLayout } from '../AdminLayout';

function renderAdminLayout(route = '/admin') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<div>dashboard section</div>} />
          <Route path="products" element={<div>products section</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminLayout', () => {
  it('labels its navigation so it is distinguishable from the site header', () => {
    renderAdminLayout();

    expect(screen.getByRole('navigation', { name: /admin sections/i })).toBeInTheDocument();
  });

  it('links to every admin section the router actually serves', () => {
    renderAdminLayout();

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: /products/i })).toHaveAttribute(
      'href',
      '/admin/products'
    );
    expect(screen.getByRole('link', { name: /categories/i })).toHaveAttribute(
      'href',
      '/admin/categories'
    );
    expect(screen.getByRole('link', { name: /orders/i })).toHaveAttribute('href', '/admin/orders');
  });

  it('renders the nested admin section alongside the navigation', () => {
    renderAdminLayout('/admin/products');

    expect(screen.getByText('products section')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /admin sections/i })).toBeInTheDocument();
  });
});
