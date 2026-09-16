import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import { EmptyState } from '../EmptyState';

// The three state blocks are the app's shared vocabulary for "waiting",
// "something went wrong" and "nothing here". Every list and detail screen
// delegates to them, so their roles and labels are worth pinning down once.

describe('LoadingState', () => {
  it('announces itself as a status region so screen readers hear the wait', () => {
    render(<LoadingState />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('renders a caller-supplied label instead of the default', () => {
    render(<LoadingState label="Loading products…" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading products…');
  });

  it('hides the decorative spinner from assistive technology', () => {
    const { container } = render(<LoadingState />);

    expect(container.querySelector('.spinner')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('ErrorState', () => {
  it('exposes the message as an alert so it is announced immediately', () => {
    render(<ErrorState message="Could not reach the server." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server.');
  });

  it('offers no retry affordance when the caller cannot recover', () => {
    render(<ErrorState message="We couldn't find that order." />);

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('calls onRetry when the user chooses to try again', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Something went wrong." onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('is keyboard operable, the retry button can be reached and fired with the keyboard', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Something went wrong." onRetry={onRetry} />);

    await userEvent.tab();
    expect(screen.getByRole('button', { name: /try again/i })).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState', () => {
  it('renders the title on its own when no hint is given', () => {
    render(<EmptyState title="Your cart is empty." />);

    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });

  it('renders the hint alongside the title when one is given', () => {
    render(
      <EmptyState title="Your cart is empty." hint="Browse the catalog to find something you like." />
    );

    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
    expect(
      screen.getByText('Browse the catalog to find something you like.')
    ).toBeInTheDocument();
  });

  it('is not announced as an error, an empty result is a normal outcome', () => {
    render(<EmptyState title="No products match your search." />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
