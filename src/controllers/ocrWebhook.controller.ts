import type { Request, Response } from 'express';
import taskModel from '../models/task.model.js';
import auditLogModel from '../models/auditLog.model.js';
import type mongoose from 'mongoose';

const FINANCIAL_KEYWORDS = ['invoice', 'contract', 'payment', 'due', 'legal', 'terms'];
const PROMO_KEYWORDS = ['sale', 'limited time', 'discount', 'unsubscribe'];

function containsKeyword(text: string, keywords: string[]): boolean {
  const lowered = text.toLowerCase();
  return keywords.some((k) => lowered.includes(k));
}

function extractUnsubscribeInfo(text: string): { channel: 'email' | 'url'; target: string } | null {
  // simple regexes for unsubscribe email or URL
  const emailMatch = text.match(/unsubscribe.*?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
  if (emailMatch) return { channel: 'email', target: emailMatch[1] as string };

  const urlMatch = text.match(/unsubscribe.*?(https?:\/\/[^\s>]+)/i);
  if (urlMatch) return { channel: 'url', target: urlMatch[1] as string };

  return null;
}

async function ocrWebhookHandler(req: Request, res: Response) {
  try {
    const { source, imageId, text, meta } = req.body;
    if (!source || !imageId || !text) {
      return res.status(400).json({ message: 'source, imageId, and text are required' });
    }

    // For demo, assume a function maps source to userId, or userId provided in meta
    const userId = meta?.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User association required (userId in meta)' });
    }

    // Classification
    let classification: 'official' | 'ad' | 'unknown' = 'unknown';
    if (containsKeyword(text, FINANCIAL_KEYWORDS)) classification = 'official';
    else if (containsKeyword(text, PROMO_KEYWORDS)) classification = 'ad';

    // Initialize audit log metadata
    const auditMetadata: any = { source, imageId, classification, meta };

    // Prepare to create task if ad and unsubscribe details found
    let createdTask = null;

    if (classification === 'ad') {
      const unsubInfo = extractUnsubscribeInfo(text);
      if (unsubInfo) {
        // Rate-limit: max 3 tasks per user-source-day
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const taskCount = await taskModel.countDocuments({
          userId,
          source,
          createdAt: { $gte: startOfDay },
        });

        if (taskCount < 3) {
          const newTask = new taskModel({
            userId,
            status: 'pending',
            channel: unsubInfo.channel,
            target: unsubInfo.target,
            source,
            classification,
            createdAt: new Date(),
          });
          createdTask = await newTask.save();
          auditMetadata.taskId = createdTask._id;
        } else {
          auditMetadata.taskCreationSkipped = 'Rate limit exceeded';
        }
      } else {
        auditMetadata.unsubscribeInfo = 'Not found';
      }
    }else if (classification === 'official') {
      auditMetadata.note = 'Official document - no task created';
    }

    // Save audit log
    const auditLog = new auditLogModel({
      at: new Date(),
      userId,
      action: 'webhook_ingest',
      entityId: createdTask?._id as mongoose.Types.ObjectId,
      entityType: 'webhook_event',
      metadata: auditMetadata,
    });
    await auditLog.save();

    // Update task with auditLogId if task created
    if (createdTask) {
      createdTask.auditlogId = auditLog._id as mongoose.Types.ObjectId;
      await createdTask.save();
    }

    return res.status(200).json({
      classification,
      taskCreated: createdTask ? true : false,
      taskId: createdTask?._id || null,
    });
  } catch (error) {
    console.error('OCR webhook error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default {
  ocrWebhookHandler
}
