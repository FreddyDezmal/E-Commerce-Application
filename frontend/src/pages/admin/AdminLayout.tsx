import { NavLink, Outlet } from 'react-router-dom';

export function AdminLayout() {
  return (
    <div className="admin-layout">
      <nav className="admin-layout__nav" aria-label="Admin sections">
        <NavLink to="/admin" end>
          Dashboard
        </NavLink>
        <NavLink to="/admin/products">Products</NavLink>
        <NavLink to="/admin/categories">Categories</NavLink>
        <NavLink to="/admin/orders">Orders</NavLink>
      </nav>
      <div className="admin-layout__content">
        <Outlet />
      </div>
    </div>
  );
}
