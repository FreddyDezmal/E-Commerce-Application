import { NextFunction, Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { UnauthorizedError } from '../errors/AppError';

interface QueryHolder {
  validatedQuery?: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
  };
}

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  list = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = (req as unknown as QueryHolder).validatedQuery ?? {};

      const result = await this.productService.listProducts({
        search: query.search,
        categoryId: query.category,
        page: query.page,
        limit: query.limit
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const productId = req.params.id;

      if (Array.isArray(productId)) {
        throw new Error('Invalid product ID');
      }

      const product = await this.productService.getProduct(productId);

      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  };

  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const product = await this.productService.createProduct(req.body);

      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  };

  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const productId = req.params.id;

      if (Array.isArray(productId)) {
        throw new Error('Invalid product ID');
      }

      const product = await this.productService.updateProduct(
        productId,
        req.body
      );

      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  };

  deactivate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const productId = req.params.id;

      if (Array.isArray(productId)) {
        throw new Error('Invalid product ID');
      }

      await this.productService.deactivateProduct(productId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}