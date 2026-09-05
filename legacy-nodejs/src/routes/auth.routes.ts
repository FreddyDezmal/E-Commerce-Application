import { Router } from 'express';
import { authController } from '../container';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validators/auth.validators';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);

export default router;
