import { Router } from 'express';
import { productController } from '../container';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { validateBody, validateQuery } from '../middleware/validate';
import { createProductSchema, listProductsQuerySchema, updateProductSchema } from '../validators/product.validators';

const router = Router();

router.get('/', validateQuery(listProductsQuerySchema), productController.list);
router.get('/:id', productController.getById);
router.post('/', authenticate, requireRole('admin'), validateBody(createProductSchema), productController.create);
router.put('/:id', authenticate, requireRole('admin'), validateBody(updateProductSchema), productController.update);
router.delete('/:id', authenticate, requireRole('admin'), productController.deactivate);

export default router;
