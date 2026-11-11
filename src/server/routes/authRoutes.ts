import { Router } from 'express';
import { register, login, me, updateProfile } from '../controllers/authController.js';
import { authenticateJwt } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateJwt, me);
router.patch('/profile', authenticateJwt, updateProfile);

export default router;
