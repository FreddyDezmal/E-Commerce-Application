import { UserRepository } from './repositories/user.repository';
import { CategoryRepository } from './repositories/category.repository';
import { ProductRepository } from './repositories/product.repository';
import { CartRepository } from './repositories/cart.repository';
import { OrderRepository } from './repositories/order.repository';

import { AuthService } from './services/auth.service';
import { ProductService } from './services/product.service';
import { CategoryService } from './services/category.service';
import { CartService } from './services/cart.service';
import { OrderService } from './services/order.service';
import { UserService } from './services/user.service';

import { AuthController } from './controllers/auth.controller';
import { ProductController } from './controllers/product.controller';
import { CategoryController } from './controllers/category.controller';
import { CartController } from './controllers/cart.controller';
import { OrderController } from './controllers/order.controller';
import { UserController } from './controllers/user.controller';

// Repositories
const userRepository = new UserRepository();
// AddressRepository is implemented (src/repositories/address.repository.ts)
// it is intentionally left uninstantiated until a consumer exists.
const categoryRepository = new CategoryRepository();
const productRepository = new ProductRepository();
const cartRepository = new CartRepository();
const orderRepository = new OrderRepository();

// Services
const authService = new AuthService(userRepository);
const productService = new ProductService(productRepository, categoryRepository);
const categoryService = new CategoryService(categoryRepository);
const cartService = new CartService(cartRepository, productRepository);
const orderService = new OrderService(orderRepository, cartRepository, productRepository);
const userService = new UserService(userRepository);

// Controllers
export const authController = new AuthController(authService);
export const productController = new ProductController(productService);
export const categoryController = new CategoryController(categoryService);
export const cartController = new CartController(cartService);
export const orderController = new OrderController(orderService);
export const userController = new UserController(userService);
