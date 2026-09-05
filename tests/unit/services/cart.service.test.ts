import { CartService } from '../../../src/services/cart.service';
import {
  ICartRepository,
  IProductRepository
} from '../../../src/repositories/interfaces';
import {
  CartRecord,
  ProductRecord
} from '../../../src/types/domain';

describe('CartService', () => {
  const cartRepository: jest.Mocked<ICartRepository> = {
    findOrCreateByUser: jest.fn(),
    findItem: jest.fn(),
    addItem: jest.fn(),
    updateItemQuantity: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  };

  const productRepository: jest.Mocked<IProductRepository> = {
    findMany: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    decrementStock: jest.fn()
  };

  const cartService = new CartService(
    cartRepository,
    productRepository
  );

  const cart: CartRecord = {
    id: 'cart-123',
    userId: 'user-123',
    items: [
      {
        id: 'cart-item-123',
        cartId: 'cart-123',
        productId: 'product-123',
        quantity: 2
      }
    ]
  };

  const emptyCart: CartRecord = {
    id: 'cart-123',
    userId: 'user-123',
    items: []
  };

  const product: ProductRecord = {
    id: 'product-123',
    name: 'Test Product',
    description: 'A test product',
    price: 100,
    stockQuantity: 10,
    categoryId: 'category-123',
    isActive: true,
    createdAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get a user cart successfully', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(cart);

    const result = await cartService.getCart('user-123');

    expect(cartRepository.findOrCreateByUser).toHaveBeenCalledWith(
      'user-123'
    );

    expect(result).toEqual(cart);
  });

  it('should add a new item to the cart successfully', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(emptyCart);
    productRepository.findById.mockResolvedValue(product);
    cartRepository.findItem.mockResolvedValue(null);
    cartRepository.addItem.mockResolvedValue(cart);

    const result = await cartService.addItem(
      'user-123',
      'product-123',
      2
    );

    expect(cartRepository.findOrCreateByUser).toHaveBeenCalledWith(
      'user-123'
    );

    expect(productRepository.findById).toHaveBeenCalledWith(
      'product-123'
    );

    expect(cartRepository.findItem).toHaveBeenCalledWith(
      'cart-123',
      'product-123'
    );

    expect(cartRepository.addItem).toHaveBeenCalledWith(
      'cart-123',
      'product-123',
      2
    );

    expect(result).toEqual(cart);
  });

  it('should increase the quantity when the item already exists', async () => {
    const existingItem = {
      id: 'cart-item-123',
      quantity: 2
    };

    cartRepository.findOrCreateByUser.mockResolvedValue(cart);
    productRepository.findById.mockResolvedValue(product);
    cartRepository.findItem.mockResolvedValue(existingItem);
    cartRepository.updateItemQuantity.mockResolvedValue(cart);

    const result = await cartService.addItem(
      'user-123',
      'product-123',
      3
    );

    expect(cartRepository.updateItemQuantity).toHaveBeenCalledWith(
      'cart-123',
      'cart-item-123',
      5
    );

    expect(cartRepository.addItem).not.toHaveBeenCalled();

    expect(result).toEqual(cart);
  });

  it('should reject adding an invalid quantity', async () => {
    await expect(
      cartService.addItem('user-123', 'product-123', 0)
    ).rejects.toThrow('Quantity must be a positive integer');

    await expect(
      cartService.addItem('user-123', 'product-123', -1)
    ).rejects.toThrow('Quantity must be a positive integer');

    await expect(
      cartService.addItem('user-123', 'product-123', 1.5)
    ).rejects.toThrow('Quantity must be a positive integer');

    expect(cartRepository.findOrCreateByUser).not.toHaveBeenCalled();
  });

  it('should reject adding an inactive or missing product', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(emptyCart);
    productRepository.findById.mockResolvedValue(null);

    await expect(
      cartService.addItem('user-123', 'product-123', 1)
    ).rejects.toThrow('Product');

    expect(cartRepository.findItem).not.toHaveBeenCalled();
    expect(cartRepository.addItem).not.toHaveBeenCalled();
  });

  it('should reject adding an inactive product', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(emptyCart);
    productRepository.findById.mockResolvedValue({
      ...product,
      isActive: false
    });

    await expect(
      cartService.addItem('user-123', 'product-123', 1)
    ).rejects.toThrow('Product');

    expect(cartRepository.addItem).not.toHaveBeenCalled();
  });

  it('should reject adding more items than available stock', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(emptyCart);
    productRepository.findById.mockResolvedValue({
      ...product,
      stockQuantity: 2
    });
    cartRepository.findItem.mockResolvedValue(null);

    await expect(
      cartService.addItem('user-123', 'product-123', 3)
    ).rejects.toThrow(
      'Only 2 unit(s) of "Test Product" are available'
    );

    expect(cartRepository.addItem).not.toHaveBeenCalled();
  });

  it('should reject increasing an existing item beyond available stock', async () => {
    const existingItem = {
      id: 'cart-item-123',
      quantity: 2
    };

    cartRepository.findOrCreateByUser.mockResolvedValue(cart);
    productRepository.findById.mockResolvedValue({
      ...product,
      stockQuantity: 4
    });
    cartRepository.findItem.mockResolvedValue(existingItem);

    await expect(
      cartService.addItem('user-123', 'product-123', 3)
    ).rejects.toThrow(
      'Only 4 unit(s) of "Test Product" are available'
    );

    expect(cartRepository.updateItemQuantity).not.toHaveBeenCalled();
  });

  it('should update an existing cart item quantity successfully', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(cart);
    productRepository.findById.mockResolvedValue(product);
    cartRepository.updateItemQuantity.mockResolvedValue(cart);

    const result = await cartService.updateItemQuantity(
      'user-123',
      'cart-item-123',
      5
    );

    expect(cartRepository.findOrCreateByUser).toHaveBeenCalledWith(
      'user-123'
    );

    expect(productRepository.findById).toHaveBeenCalledWith(
      'product-123'
    );

    expect(cartRepository.updateItemQuantity).toHaveBeenCalledWith(
      'cart-123',
      'cart-item-123',
      5
    );

    expect(result).toEqual(cart);
  });

  it('should reject an invalid update quantity', async () => {
    await expect(
      cartService.updateItemQuantity(
        'user-123',
        'cart-item-123',
        -1
      )
    ).rejects.toThrow(
      'Quantity must be zero or a positive integer'
    );

    await expect(
      cartService.updateItemQuantity(
        'user-123',
        'cart-item-123',
        1.5
      )
    ).rejects.toThrow(
      'Quantity must be zero or a positive integer'
    );

    expect(cartRepository.findOrCreateByUser).not.toHaveBeenCalled();
  });

  it('should reject updating a cart item that does not exist', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(emptyCart);

    await expect(
      cartService.updateItemQuantity(
        'user-123',
        'unknown-item',
        2
      )
    ).rejects.toThrow('Cart item');

    expect(productRepository.findById).not.toHaveBeenCalled();
    expect(cartRepository.updateItemQuantity).not.toHaveBeenCalled();
  });

  it('should remove the item when update quantity is zero', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(cart);
    cartRepository.removeItem.mockResolvedValue(emptyCart);

    const result = await cartService.updateItemQuantity(
      'user-123',
      'cart-item-123',
      0
    );

    expect(cartRepository.removeItem).toHaveBeenCalledWith(
      'cart-123',
      'cart-item-123'
    );

    expect(productRepository.findById).not.toHaveBeenCalled();

    expect(result).toEqual(emptyCart);
  });

  it('should reject updating an item when the product does not exist', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(cart);
    productRepository.findById.mockResolvedValue(null);

    await expect(
      cartService.updateItemQuantity(
        'user-123',
        'cart-item-123',
        3
      )
    ).rejects.toThrow('Product');

    expect(cartRepository.updateItemQuantity).not.toHaveBeenCalled();
  });

  it('should reject updating an item when the product is inactive', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(cart);
    productRepository.findById.mockResolvedValue({
      ...product,
      isActive: false
    });

    await expect(
      cartService.updateItemQuantity(
        'user-123',
        'cart-item-123',
        3
      )
    ).rejects.toThrow('Product');

    expect(cartRepository.updateItemQuantity).not.toHaveBeenCalled();
  });

  it('should reject updating quantity beyond available stock', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(cart);
    productRepository.findById.mockResolvedValue({
      ...product,
      stockQuantity: 2
    });

    await expect(
      cartService.updateItemQuantity(
        'user-123',
        'cart-item-123',
        3
      )
    ).rejects.toThrow(
      'Only 2 unit(s) of "Test Product" are available'
    );

    expect(cartRepository.updateItemQuantity).not.toHaveBeenCalled();
  });

  it('should remove a cart item successfully', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(cart);
    cartRepository.removeItem.mockResolvedValue(emptyCart);

    const result = await cartService.removeItem(
      'user-123',
      'cart-item-123'
    );

    expect(cartRepository.findOrCreateByUser).toHaveBeenCalledWith(
      'user-123'
    );

    expect(cartRepository.removeItem).toHaveBeenCalledWith(
      'cart-123',
      'cart-item-123'
    );

    expect(result).toEqual(emptyCart);
  });

  it('should reject removing a cart item that does not exist', async () => {
    cartRepository.findOrCreateByUser.mockResolvedValue(emptyCart);

    await expect(
      cartService.removeItem('user-123', 'unknown-item')
    ).rejects.toThrow('Cart item');

    expect(cartRepository.removeItem).not.toHaveBeenCalled();
  });
});