import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="state-block state-block--empty">
      <p className="state-block__title">Page not found.</p>
      <p>
        <Link to="/">Back to the catalog</Link>
      </p>
    </div>
  );
}
