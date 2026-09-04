import { Router } from 'express';
import { cartController } from '../container';
import { authenticate } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import { addCartItemSchema, updateCartItemSchema } from '../validators/cart.validators';

const router = Router();


router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', validateBody(addCartItemSchema), cartController.addItem);
router.put('/items/:id', validateBody(updateCartItemSchema), cartController.updateItem);
router.delete('/items/:id', cartController.removeItem);

export default router;
