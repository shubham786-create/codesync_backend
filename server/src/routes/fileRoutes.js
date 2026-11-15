import { Router } from 'express';
import {
  listFiles,
  getFile,
  createFile,
  updateFile,
  deleteFile,
} from '../controllers/fileController.js';
import { requireWorkspaceAccess } from '../middleware/workspaceAuthMiddleware.js';

const router = Router({ mergeParams: true });

// Read files requires viewer role
router.get('/', requireWorkspaceAccess('viewer'), listFiles);
router.get('/:fileId', requireWorkspaceAccess('viewer'), getFile);

// Create, update, delete files requires editor role
router.post('/', requireWorkspaceAccess('editor'), createFile);
router.patch('/:fileId', requireWorkspaceAccess('editor'), updateFile);
router.delete('/:fileId', requireWorkspaceAccess('editor'), deleteFile);

export default router;
