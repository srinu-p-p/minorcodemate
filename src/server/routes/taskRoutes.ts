import { Router } from 'express';
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/taskController.js';
import { authenticateJwt } from '../middleware/auth.js';
import { requireProjectAccess } from '../middleware/projectAuth.js';

const router = Router({ mergeParams: true });

router.use(authenticateJwt);
router.use(requireProjectAccess('viewer'));

router.get('/', listTasks);
router.post('/', requireProjectAccess('editor'), createTask);
router.patch('/:taskId', requireProjectAccess('editor'), updateTask);
router.delete('/:taskId', requireProjectAccess('editor'), deleteTask);

export default router;
