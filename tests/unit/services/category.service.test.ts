import { CategoryService } from '../../../src/services/category.service';
import { ICategoryRepository } from '../../../src/repositories/interfaces';
import { CategoryRecord } from '../../../src/types/domain';

describe('CategoryService', () => {
  const categoryRepository: jest.Mocked<ICategoryRepository> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    hasProducts: jest.fn(),
    delete: jest.fn()
  };

  const categoryService = new CategoryService(categoryRepository);

  const category: CategoryRecord = {
    id: 'category-123',
    name: 'Electronics'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list all categories successfully', async () => {
    categoryRepository.findAll.mockResolvedValue([category]);

    const result = await categoryService.listCategories();

    expect(categoryRepository.findAll).toHaveBeenCalled();
    expect(result).toEqual([category]);
  });

  it('should create a category successfully', async () => {
    categoryRepository.findByName.mockResolvedValue(null);
    categoryRepository.create.mockResolvedValue(category);

    const result = await categoryService.createCategory({
      name: 'Electronics'
    });

    expect(categoryRepository.findByName).toHaveBeenCalledWith(
      'Electronics'
    );

    expect(categoryRepository.create).toHaveBeenCalledWith(
      'Electronics'
    );

    expect(result).toEqual(category);
  });

  it('should reject invalid category data', async () => {
    await expect(
      categoryService.createCategory({
        name: ''
      })
    ).rejects.toThrow('Invalid category data');

    expect(categoryRepository.findByName).not.toHaveBeenCalled();
    expect(categoryRepository.create).not.toHaveBeenCalled();
  });

  it('should reject a category when the name already exists', async () => {
    categoryRepository.findByName.mockResolvedValue(category);

    await expect(
      categoryService.createCategory({
        name: 'Electronics'
      })
    ).rejects.toThrow('already exists');

    expect(categoryRepository.findByName).toHaveBeenCalledWith(
      'Electronics'
    );

    expect(categoryRepository.create).not.toHaveBeenCalled();
  });

  it('should delete a category successfully when it has no products', async () => {
    categoryRepository.findById.mockResolvedValue(category);
    categoryRepository.hasProducts.mockResolvedValue(false);
    categoryRepository.delete.mockResolvedValue(undefined);

    await categoryService.deleteCategory('category-123');

    expect(categoryRepository.findById).toHaveBeenCalledWith(
      'category-123'
    );

    expect(categoryRepository.hasProducts).toHaveBeenCalledWith(
      'category-123'
    );

    expect(categoryRepository.delete).toHaveBeenCalledWith(
      'category-123'
    );
  });

  it('should reject deleting a category that does not exist', async () => {
    categoryRepository.findById.mockResolvedValue(null);

    await expect(
      categoryService.deleteCategory('unknown-category')
    ).rejects.toThrow('Category');

    expect(categoryRepository.findById).toHaveBeenCalledWith(
      'unknown-category'
    );

    expect(categoryRepository.hasProducts).not.toHaveBeenCalled();
    expect(categoryRepository.delete).not.toHaveBeenCalled();
  });

  it('should reject deleting a category that still has products', async () => {
    categoryRepository.findById.mockResolvedValue(category);
    categoryRepository.hasProducts.mockResolvedValue(true);

    await expect(
      categoryService.deleteCategory('category-123')
    ).rejects.toThrow('Cannot delete a category');

    expect(categoryRepository.findById).toHaveBeenCalledWith(
      'category-123'
    );

    expect(categoryRepository.hasProducts).toHaveBeenCalledWith(
      'category-123'
    );

    expect(categoryRepository.delete).not.toHaveBeenCalled();
  });
});