import { NextFunction, Request, Response } from 'express';
import { CategoryService } from '../services/category.service';

export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  list = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const categories = await this.categoryService.listCategories();
      res.status(200).json(categories);
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
      const category = await this.categoryService.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  };

  remove = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const categoryId = req.params.id;

      if (Array.isArray(categoryId)) {
        throw new Error('Invalid category ID');
      }

      await this.categoryService.deleteCategory(categoryId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}