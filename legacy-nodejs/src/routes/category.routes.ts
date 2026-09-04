import { Router } from 'express';
import { categoryController } from '../container';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { createCategorySchema } from '../validators/product.validators';

const router = Router();

router.get('/', categoryController.list);
router.post('/', authenticate, requireRole('admin'), validateBody(createCategorySchema), categoryController.create);
router.delete('/:id', authenticate, requireRole('admin'), categoryController.remove);

export default router;
