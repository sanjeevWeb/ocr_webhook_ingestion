import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import type { ITag } from '../models/tag.model.js';
import tagModel from '../models/tag.model.js';

/**
 * Create a new tag
 */
const createTag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, isPrimary } = req.body;
    const ownerId = req.user?.sub;

    if (!name || !ownerId) {
      res.status(400).json({ message: 'name and ownerId are required' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      res.status(400).json({ message: 'Invalid ownerId' });
      return;
    }

    const isPrimaryBool =
      typeof isPrimary === 'boolean' ? isPrimary : isPrimary === 'true' ? true : false;

    const tag: ITag = new tagModel({ name, ownerId, isPrimary: isPrimaryBool });
    const savedTag = await tag.save();

    res.status(201).json(savedTag);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a tag by ID
 */
const updateTag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user?.sub;

    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      res.status(400).json({ message: 'Invalid tag ID' });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Check ownership
    const tag = await tagModel.findById(id);
    if (!tag) {
      res.status(404).json({ message: 'Tag not found' });
      return;
    }

    if (tag.ownerId.toString() !== userId) {
      res.status(403).json({ message: 'You are not authorized to update this tag' });
      return;
    }

    tag.name = name || tag.name;
    const updatedTag = await tag.save();

    res.status(200).json(updatedTag);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all tags (optionally filtered by ownerId)
 */
const getTags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ownerId } = req.query;

    const filter: Record<string, any> = {};
    if (ownerId && mongoose.Types.ObjectId.isValid(String(ownerId))) {
      filter.ownerId = ownerId;
    }

    const tags = await tagModel.find(filter).sort({ createdAt: -1 });

    res.status(200).json(tags);
  } catch (error) {
    next(error);
  }
};

export default {
  createTag,
  getTags,
  updateTag,
};
