import { Router } from 'express';
import {
  handleReview,
  handleExplain,
  handleChat,
  getAiStatus,
} from '../controllers/aiController.js';
import { authenticateJwt } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJwt);

router.get('/status', getAiStatus);
router.post('/review', handleReview);
router.post('/explain', handleExplain);
router.post('/chat', handleChat);

export default router;
