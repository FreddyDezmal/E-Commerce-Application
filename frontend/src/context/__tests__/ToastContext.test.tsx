import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from '../ToastContext';

// Toasts are how add-to-cart, remove-from-cart, profile saves and every admin
// mutation report success or failure, so the announcement behaviour is shared
// by a lot of screens.

function ToastTrigger() {
  const { notify } = useToast();
  return (
    <div>
      <button type="button" onClick={() => notify('Added to cart.')}>
        succeed
      </button>
      <button type="button" onClick={() => notify('Could not add the item.', 'error')}>
        fail
      </button>
    </div>
  );
}

function renderWithToasts() {
  return render(
    <ToastProvider>
      <ToastTrigger />
    </ToastProvider>
  );
}

describe('ToastContext', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders no toast until something is notified', () => {
    renderWithToasts();

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('announces a success message politely rather than as an alert', async () => {
    renderWithToasts();

    await userEvent.click(screen.getByRole('button', { name: 'succeed' }));

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveTextContent('Added to cart.');
  });

  it('shows an error message through the same live region', async () => {
    renderWithToasts();

    await userEvent.click(screen.getByRole('button', { name: 'fail' }));

    expect(screen.getByRole('status')).toHaveTextContent('Could not add the item.');
  });

  it('stacks multiple messages instead of replacing the previous one', async () => {
    renderWithToasts();

    await userEvent.click(screen.getByRole('button', { name: 'succeed' }));
    await userEvent.click(screen.getByRole('button', { name: 'fail' }));

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveTextContent('Added to cart.');
    expect(liveRegion).toHaveTextContent('Could not add the item.');
  });

  it('throws a helpful error when useToast is used outside its provider', () => {
    // React logs the thrown render error; silence it so the run stays readable.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<ToastTrigger />)).toThrow(/must be used within a ToastProvider/i);

    consoleError.mockRestore();
  });
});

describe('ToastContext dismissal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears the message on its own so it does not linger on screen', () => {
    // fireEvent rather than userEvent here: userEvent schedules its own timers,
    // which deadlock against the faked clock this test needs to control.
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'succeed' }));
    expect(screen.getByText('Added to cart.')).toBeInTheDocument();

    // Advance well past the dismissal delay rather than asserting the exact
    // constant, the behaviour that matters is "it goes away by itself".
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.queryByText('Added to cart.')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
