import { Router } from 'express';
import {
  listWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from '../controllers/workspaceController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireWorkspaceAccess } from '../middleware/workspaceAuthMiddleware.js';
import fileRoutes from './fileRoutes.js';
import { getMessages } from '../controllers/chatController.js';
import {
  listMembers,
  createInvitation,
  updateMemberRole,
  removeMember,
} from '../controllers/memberController.js';

const router = Router();

// All workspace routes require basic authentication
router.use(requireAuth);

router.get('/', listWorkspaces);
router.post('/', createWorkspace);

router.get('/:id', requireWorkspaceAccess('viewer'), getWorkspace);
router.patch('/:id', requireWorkspaceAccess('owner'), updateWorkspace);
router.delete('/:id', requireWorkspaceAccess('owner'), deleteWorkspace);

// Mount nested file routes: /api/workspaces/:workspaceId/files
router.use('/:workspaceId/files', fileRoutes);

// Messages & Chat
router.get('/:workspaceId/messages', requireWorkspaceAccess('viewer'), getMessages);

// Members & Invitations
router.get('/:workspaceId/members', requireWorkspaceAccess('viewer'), listMembers);
router.post('/:workspaceId/invitations', requireWorkspaceAccess('editor'), createInvitation);
router.patch('/:workspaceId/members/:targetUserId', requireWorkspaceAccess('owner'), updateMemberRole);
router.delete('/:workspaceId/members/:targetUserId', removeMember);

export default router;
