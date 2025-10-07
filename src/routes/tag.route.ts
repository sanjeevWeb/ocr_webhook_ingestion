import tagController from '../controllers/tag.controller.js';
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', authMiddleware, tagController.createTag);
router.get('/', authMiddleware, tagController.getTags);

router.put('/:id', authMiddleware, tagController.updateTag);

export default router;
