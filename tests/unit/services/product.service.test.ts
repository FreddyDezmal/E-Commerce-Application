import { ProductService } from '../../../src/services/product.service';
import {
  ICategoryRepository,
  IProductRepository,
  ProductFilter
} from '../../../src/repositories/interfaces';
import { ProductRecord, CategoryRecord } from '../../../src/types/domain';

describe('ProductService', () => {
  const productRepository: jest.Mocked<IProductRepository> = {
    findMany: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    decrementStock: jest.fn()
  };

  const categoryRepository: jest.Mocked<ICategoryRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  hasProducts: jest.fn(),
  delete: jest.fn()
};

  const productService = new ProductService(
    productRepository,
    categoryRepository
  );

  const product: ProductRecord = {
    id: 'product-123',
    name: 'Test Product',
    description: 'A test product',
    price: 99.99,
    stockQuantity: 10,
    categoryId: 'category-123',
    isActive: true,
    createdAt: new Date()
  };

  const category: CategoryRecord = {
    id: 'category-123',
    name: 'Test Category'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list products successfully', async () => {
    const filter: ProductFilter = {};

    productRepository.findMany.mockResolvedValue({
      items: [product],
      total: 1
    });

    const result = await productService.listProducts(filter);

    expect(productRepository.findMany).toHaveBeenCalledWith(filter);
    expect(result).toEqual({
      items: [product],
      total: 1
    });
  });

  it('should get an active product successfully', async () => {
    productRepository.findById.mockResolvedValue(product);

    const result = await productService.getProduct('product-123');

    expect(productRepository.findById).toHaveBeenCalledWith('product-123');
    expect(result).toEqual(product);
  });

  it('should reject a product that does not exist', async () => {
    productRepository.findById.mockResolvedValue(null);

    await expect(
      productService.getProduct('unknown-product')
    ).rejects.toThrow('Product');

    expect(productRepository.findById).toHaveBeenCalledWith(
      'unknown-product'
    );
  });

  it('should reject an inactive product', async () => {
    productRepository.findById.mockResolvedValue({
      ...product,
      isActive: false
    });

    await expect(
      productService.getProduct('product-123')
    ).rejects.toThrow('Product');
  });

  it('should create a product successfully', async () => {
    categoryRepository.findById.mockResolvedValue(category);
    productRepository.create.mockResolvedValue(product);

    const result = await productService.createProduct({
      name: 'Test Product',
      description: 'A test product',
      price: 99.99,
      stockQuantity: 10,
      categoryId: 'category-123'
    });

    expect(categoryRepository.findById).toHaveBeenCalledWith(
      'category-123'
    );

    expect(productRepository.create).toHaveBeenCalledWith({
      name: 'Test Product',
      description: 'A test product',
      price: 99.99,
      stockQuantity: 10,
      categoryId: 'category-123'
    });

    expect(result).toEqual(product);
  });

  it('should create a product without a category', async () => {
    const productWithoutCategory: ProductRecord = {
      ...product,
      categoryId: null
    };

    productRepository.create.mockResolvedValue(productWithoutCategory);

    const result = await productService.createProduct({
      name: 'Test Product',
      description: null,
      price: 99.99,
      stockQuantity: 10,
      categoryId: null
    });

    expect(categoryRepository.findById).not.toHaveBeenCalled();

    expect(productRepository.create).toHaveBeenCalledWith({
      name: 'Test Product',
      description: null,
      price: 99.99,
      stockQuantity: 10,
      categoryId: null
    });

    expect(result).toEqual(productWithoutCategory);
  });

  it('should reject product creation when the category does not exist', async () => {
    categoryRepository.findById.mockResolvedValue(null);

    await expect(
      productService.createProduct({
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        stockQuantity: 10,
        categoryId: 'unknown-category'
      })
    ).rejects.toThrow('Category');

    expect(productRepository.create).not.toHaveBeenCalled();
  });

  it('should reject invalid product data when creating a product', async () => {
    await expect(
      productService.createProduct({
        name: '',
        description: 'Invalid product',
        price: -10,
        stockQuantity: -1,
        categoryId: null
      })
    ).rejects.toThrow('Invalid product data');

    expect(categoryRepository.findById).not.toHaveBeenCalled();
    expect(productRepository.create).not.toHaveBeenCalled();
  });

  it('should update a product successfully', async () => {
    const updatedProduct: ProductRecord = {
      ...product,
      name: 'Updated Product',
      price: 149.99
    };

    productRepository.findById.mockResolvedValue(product);
    productRepository.update.mockResolvedValue(updatedProduct);

    const result = await productService.updateProduct('product-123', {
      name: 'Updated Product',
      price: 149.99
    });

    expect(productRepository.findById).toHaveBeenCalledWith('product-123');

    expect(productRepository.update).toHaveBeenCalledWith(
      'product-123',
      {
        name: 'Updated Product',
        price: 149.99
      }
    );

    expect(result).toEqual(updatedProduct);
  });

  it('should reject updating a product that does not exist', async () => {
    productRepository.findById.mockResolvedValue(null);

    await expect(
      productService.updateProduct('unknown-product', {
        name: 'Updated Product'
      })
    ).rejects.toThrow('Product');

    expect(productRepository.update).not.toHaveBeenCalled();
  });

  it('should reject invalid product data when updating a product', async () => {
    productRepository.findById.mockResolvedValue(product);

    await expect(
      productService.updateProduct('product-123', {
        price: -10
      })
    ).rejects.toThrow('Invalid product data');

    expect(productRepository.update).not.toHaveBeenCalled();
  });

  it('should deactivate a product successfully', async () => {
    const deactivatedProduct: ProductRecord = {
      ...product,
      isActive: false
    };

    productRepository.findById.mockResolvedValue(product);
    productRepository.deactivate.mockResolvedValue(deactivatedProduct);

    const result = await productService.deactivateProduct('product-123');

    expect(productRepository.findById).toHaveBeenCalledWith('product-123');
    expect(productRepository.deactivate).toHaveBeenCalledWith('product-123');
    expect(result).toEqual(deactivatedProduct);
  });

  it('should reject deactivating a product that does not exist', async () => {
    productRepository.findById.mockResolvedValue(null);

    await expect(
      productService.deactivateProduct('unknown-product')
    ).rejects.toThrow('Product');

    expect(productRepository.deactivate).not.toHaveBeenCalled();
  });
});