import { Router } from 'express';
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js';
import {
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
} from '../controllers/memberController.js';
import { authenticateJwt } from '../middleware/auth.js';
import { requireProjectAccess } from '../middleware/projectAuth.js';

const router = Router();

// Project routes
router.use(authenticateJwt);

router.post('/', createProject);
router.get('/', listProjects);
router.get('/:id', requireProjectAccess('viewer'), getProject);
router.patch('/:id', requireProjectAccess('editor'), updateProject);
router.delete('/:id', deleteProject);

// Member routes nested under project
router.get('/:projectId/members', requireProjectAccess('viewer'), listMembers);
router.post('/:projectId/members', requireProjectAccess('editor'), addMember);
router.patch('/:projectId/members/:memberId', requireProjectAccess('owner'), updateMemberRole);
router.delete('/:projectId/members/:memberId', removeMember);

export default router;
