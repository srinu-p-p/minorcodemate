import { Router } from 'express';
import {
  createSnapshot,
  listSnapshots,
  getSnapshot,
  restoreSnapshot,
} from '../controllers/snapshotController.js';
import { authenticateJwt } from '../middleware/auth.js';
import { requireProjectAccess } from '../middleware/projectAuth.js';

const router = Router({ mergeParams: true });

router.use(authenticateJwt);
router.use(requireProjectAccess('viewer'));

router.get('/', listSnapshots);
router.get('/:snapshotId', getSnapshot);
router.post('/', requireProjectAccess('editor'), createSnapshot);
router.post('/:snapshotId/restore', requireProjectAccess('editor'), restoreSnapshot);

export default router;
