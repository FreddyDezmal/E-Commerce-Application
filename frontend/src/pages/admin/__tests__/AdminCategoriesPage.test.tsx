import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminCategoriesPage } from '../AdminCategoriesPage';
import { ToastProvider } from '../../../context/ToastContext';
import { categoryApi } from '../../../api/categoryApi';
import { createMockCategory } from '../../../test/fixtures';
import type { Category } from '../../../types/api';

vi.mock('../../../api/categoryApi');

function renderAdminCategories() {
  return render(
    <ToastProvider>
      <AdminCategoriesPage />
    </ToastProvider>
  );
}

const kitchen = createMockCategory({ id: 'c-kitchen', name: 'Kitchen' });
const office = createMockCategory({ id: 'c-office', name: 'Office' });

describe('AdminCategoriesPage loading and error states', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading indicator while categories are fetched', () => {
    vi.mocked(categoryApi.list).mockReturnValue(new Promise<Category[]>(() => {}));

    renderAdminCategories();

    expect(screen.getByText('Loading categories…')).toBeInTheDocument();
  });

  it('reports a failed load with a retry action', async () => {
    vi.mocked(categoryApi.list).mockRejectedValue(new Error('Server error.'));

    renderAdminCategories();

    expect(await screen.findByRole('alert')).toHaveTextContent('Server error.');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('loads the categories when the admin retries', async () => {
    vi.mocked(categoryApi.list)
      .mockRejectedValueOnce(new Error('Server error.'))
      .mockResolvedValueOnce([kitchen]);

    renderAdminCategories();
    await screen.findByRole('alert');

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Kitchen')).toBeInTheDocument();
  });
});

describe('AdminCategoriesPage empty state', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('prompts the admin to add one when no categories exist', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);

    renderAdminCategories();

    expect(await screen.findByText('No categories yet.')).toBeInTheDocument();
    expect(
      screen.getByText('Add one above to start organizing products.')
    ).toBeInTheDocument();
  });

  it('still offers the create form while the list is empty', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([]);

    renderAdminCategories();

    await screen.findByText('No categories yet.');
    expect(screen.getByLabelText(/category name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add category/i })).toBeInTheDocument();
  });
});

describe('AdminCategoriesPage listing', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows every category returned by the API', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([kitchen, office]);

    renderAdminCategories();

    expect(await screen.findByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Office')).toBeInTheDocument();
  });

  it('names each delete control after the category it removes', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([kitchen, office]);

    renderAdminCategories();

    expect(await screen.findByRole('button', { name: 'Delete Kitchen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Office' })).toBeInTheDocument();
  });

  it('labels the create field for screen readers even though the label is visually hidden', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([kitchen]);

    renderAdminCategories();

    expect(await screen.findByLabelText(/category name/i)).toHaveAttribute(
      'placeholder',
      'New category name'
    );
  });
});

describe('AdminCategoriesPage creating a category', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requires a name before calling the API', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([kitchen]);

    renderAdminCategories();
    await screen.findByText('Kitchen');

    await userEvent.click(screen.getByRole('button', { name: /add category/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Category name is required.');
    expect(categoryApi.create).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only name as missing', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([kitchen]);

    renderAdminCategories();
    await screen.findByText('Kitchen');

    await userEvent.type(screen.getByLabelText(/category name/i), '   ');
    await userEvent.click(screen.getByRole('button', { name: /add category/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Category name is required.');
    expect(categoryApi.create).not.toHaveBeenCalled();
  });

  it('creates the category and confirms it to the admin', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([kitchen]);
    vi.mocked(categoryApi.create).mockResolvedValue(
      createMockCategory({ id: 'c-garden', name: 'Garden' })
    );

    renderAdminCategories();
    await screen.findByText('Kitchen');

    await userEvent.type(screen.getByLabelText(/category name/i), 'Garden');
    await userEvent.click(screen.getByRole('button', { name: /add category/i }));

    await waitFor(() => expect(categoryApi.create).toHaveBeenCalledWith({ name: 'Garden' }));
    expect(await screen.findByText('Category created.')).toBeInTheDocument();
  });

  it('refreshes the list after creating so the new category appears', async () => {
    vi.mocked(categoryApi.list)
      .mockResolvedValueOnce([kitchen])
      .mockResolvedValueOnce([kitchen, createMockCategory({ id: 'c-garden', name: 'Garden' })]);
    vi.mocked(categoryApi.create).mockResolvedValue(
      createMockCategory({ id: 'c-garden', name: 'Garden' })
    );

    renderAdminCategories();
    await screen.findByText('Kitchen');

    await userEvent.type(screen.getByLabelText(/category name/i), 'Garden');
    await userEvent.click(screen.getByRole('button', { name: /add category/i }));

    expect(await screen.findByText('Garden')).toBeInTheDocument();
  });

  it('clears the field after a successful creation', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([kitchen]);
    vi.mocked(categoryApi.create).mockResolvedValue(createMockCategory({ name: 'Garden' }));

    renderAdminCategories();
    await screen.findByText('Kitchen');

    await userEvent.type(screen.getByLabelText(/category name/i), 'Garden');
    await userEvent.click(screen.getByRole('button', { name: /add category/i }));

    await waitFor(() => expect(screen.getByLabelText(/category name/i)).toHaveValue(''));
  });

  it('disables the submit button while the creation is in flight', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([kitchen]);
    let resolveCreate: (value: Category) => void = () => {};
    vi.mocked(categoryApi.create).mockReturnValue(
      new Promise<Category>((resolve) => {
        resolveCreate = resolve;
      })
    );

    renderAdminCategories();
    await screen.findByText('Kitchen');

    await userEvent.type(screen.getByLabelText(/category name/i), 'Garden');
    await userEvent.click(screen.getByRole('button', { name: /add category/i }));

    expect(await screen.findByRole('button', { name: /adding…/i })).toBeDisabled();

    resolveCreate(createMockCategory({ name: 'Garden' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add category/i })).toBeEnabled()
    );
  });

  it('shows the backend rejection for a duplicate category', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([kitchen]);
    vi.mocked(categoryApi.create).mockRejectedValue(
      new Error('This operation conflicts with existing data.')
    );

    renderAdminCategories();
    await screen.findByText('Kitchen');

    await userEvent.type(screen.getByLabelText(/category name/i), 'Kitchen');
    await userEvent.click(screen.getByRole('button', { name: /add category/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This operation conflicts with existing data.'
    );
  });
});

describe('AdminCategoriesPage deleting a category', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the chosen category and confirms it', async () => {
    vi.mocked(categoryApi.list)
      .mockResolvedValueOnce([kitchen, office])
      .mockResolvedValueOnce([office]);
    vi.mocked(categoryApi.delete).mockResolvedValue(undefined);

    renderAdminCategories();
    await screen.findByText('Kitchen');

    await userEvent.click(screen.getByRole('button', { name: 'Delete Kitchen' }));

    await waitFor(() => expect(categoryApi.delete).toHaveBeenCalledWith('c-kitchen'));
    expect(await screen.findByText('Category deleted.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Kitchen')).not.toBeInTheDocument());
  });

  it('reports a failed deletion and leaves the category listed', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([kitchen]);
    vi.mocked(categoryApi.delete).mockRejectedValue(
      new Error('This category still has products.')
    );

    renderAdminCategories();
    await screen.findByText('Kitchen');

    await userEvent.click(screen.getByRole('button', { name: 'Delete Kitchen' }));

    expect(await screen.findByText('This category still has products.')).toBeInTheDocument();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
  });

  it('falls back to the empty state after the last category is deleted', async () => {
    vi.mocked(categoryApi.list).mockResolvedValueOnce([kitchen]).mockResolvedValueOnce([]);
    vi.mocked(categoryApi.delete).mockResolvedValue(undefined);

    renderAdminCategories();
    await screen.findByText('Kitchen');

    await userEvent.click(screen.getByRole('button', { name: 'Delete Kitchen' }));

    expect(await screen.findByText('No categories yet.')).toBeInTheDocument();
  });

  it('disables only the category being deleted', async () => {
    vi.mocked(categoryApi.list).mockResolvedValue([kitchen, office]);
    vi.mocked(categoryApi.delete).mockReturnValue(new Promise<void>(() => {}));

    renderAdminCategories();
    await screen.findByText('Kitchen');

    await userEvent.click(screen.getByRole('button', { name: 'Delete Kitchen' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Delete Kitchen' })).toBeDisabled()
    );
    expect(screen.getByRole('button', { name: 'Delete Office' })).toBeEnabled();
  });
});
