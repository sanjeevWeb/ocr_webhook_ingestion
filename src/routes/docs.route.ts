import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import docsController from '../controllers/docs.controller.js';
import { rbacMiddleware } from '../middlewares/rbac.middleware.js';
import upload, { moveFileToPrimaryTag } from '../middlewares/upload.middleware.js';

const router = Router();

router.post(
  '/v1/docs',
  authMiddleware,
  rbacMiddleware(['user', 'admin']),
  upload.single('file'),
  moveFileToPrimaryTag,
  docsController.uploadDoc,
);
router.get('/v1/folders', authMiddleware, docsController.listFolders);
router.get('/v1/folders/:tag/docs', authMiddleware, docsController.listDocsByFolder);
router.get('/v1/search', authMiddleware, docsController.searchDocs);

export default router;
