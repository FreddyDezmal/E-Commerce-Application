import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NotFoundPage } from '../NotFoundPage';

describe('NotFoundPage', () => {
  it('tells the visitor the page does not exist', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Page not found.')).toBeInTheDocument();
  });

  it('offers a route back into the catalog so the visitor is not stranded', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /back to the catalog/i })).toHaveAttribute('href', '/');
  });
});
