import { Router } from 'express';
import {
  listFiles,
  getFile,
  createFile,
  updateFile,
  deleteFile,
} from '../controllers/fileController.js';
import { authenticateJwt } from '../middleware/auth.js';
import { requireProjectAccess } from '../middleware/projectAuth.js';

const router = Router({ mergeParams: true });

router.use(authenticateJwt);
router.use(requireProjectAccess('viewer'));

router.get('/', listFiles);
router.get('/:fileId', getFile);
router.post('/', requireProjectAccess('editor'), createFile);
router.patch('/:fileId', requireProjectAccess('editor'), updateFile);
router.delete('/:fileId', requireProjectAccess('editor'), deleteFile);

export default router;
