import { Router } from 'express';
import { z } from 'zod';
import { userController } from '../container';
import { authenticate } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(authenticate);

const updateProfileSchema = z.object({ fullName: z.string().trim().min(1).max(255).optional() });

router.get('/me', userController.getMe);
router.put('/me', validateBody(updateProfileSchema), userController.updateMe);

export default router;
