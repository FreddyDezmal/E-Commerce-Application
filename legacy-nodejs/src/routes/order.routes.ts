import { Router } from 'express';
import { orderController } from '../container';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { validateBody, validateQuery } from '../middleware/validate';
import { checkoutSchema, listOrdersQuerySchema, updateOrderStatusSchema } from '../validators/order.validators';

const router = Router();

router.use(authenticate);

router.post('/', validateBody(checkoutSchema), orderController.checkout);
router.get('/', validateQuery(listOrdersQuerySchema), orderController.list);
router.get('/:id', orderController.getById);
router.put('/:id/status', requireRole('admin'), validateBody(updateOrderStatusSchema), orderController.updateStatus);

export default router;
