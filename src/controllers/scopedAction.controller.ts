// src/controllers/actions.controller.ts
import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import tagModel from '../models/tag.model.js';
import documentTagModel from '../models/documentTag.model.js';
import documentModel from '../models/document.model.js';
import usageModel from '../models/usage.model.js';
import auditLogModel from '../models/auditLog.model.js';
import type { Document as MongooseDocument } from 'mongoose';
import userModel from '../models/user.model.js';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ScopeFolder {
  type: 'folder';
  name: string;
}

interface ScopeFiles {
  type: 'files';
  ids: string[];
}

type Scope = ScopeFolder | ScopeFiles;

interface RunActionPayload {
  scope: Scope;
  messages: { role: string; content: string }[];
  actions: ('make_document' | 'make_csv')[];
}

interface ContextDoc {
  id: mongoose.Types.ObjectId;
  filename: string;
  mime: string;
  sample: string;
  detectedVendor?: string;
  detectedTotal?: string;
  wordCount: number;
}

const MAX_SAMPLE_LENGTH = 300;
const CREDIT_PER_RUN = 5;

function sanitizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function extractVendor(text: string): string | undefined {
  const m = text.match(/vendor[:\-]\s*([A-Za-z0-9 &]+)/i);
  return m ? m[1] : undefined;
}

function extractTotal(text: string): string | undefined {
  const m = text.match(/\b(total|amount|due)\s*[:\-]?\s*\$?([0-9]+(\.[0-9]{2})?)/i);
  return m ? m[2] : undefined;
}

function buildContext(documents: MongooseDocument[]) {
  return documents.map((doc) => {
    // support both doc.get() (Mongoose Document) and raw props
    const text = (
      typeof doc.get === 'function' ? doc.get('textContent') || '' : (doc as any).textContent || ''
    ) as string;
    const sample = sanitizeText(text).slice(0, MAX_SAMPLE_LENGTH);
    const filename =
      typeof doc.get === 'function' ? doc.get('filename') : ((doc as any).filename as string);
    const mime = typeof doc.get === 'function' ? doc.get('mime') : ((doc as any).mime as string);

    return {
      id: doc._id as mongoose.Types.ObjectId,
      filename,
      mime,
      sample,
      detectedVendor: extractVendor(sample),
      detectedTotal: extractTotal(sample),
      wordCount: sample ? sample.split(/\s+/).length : 0,
    };
  });
}

// Deterministic mock processor function (unchanged logic)
function mockProcessor(input: {
  messages: { role: string; content: string }[];
  actions: ('make_document' | 'make_csv')[];
  context: ContextDoc[];
  seed?: string;
}) {
  let generatedText = '';
  if (input.actions.includes('make_document')) {
    generatedText += `Summary generated for scope\n\nDocuments:\n`;
    for (const doc of input.context) {
      generatedText += `- ${doc.filename}: ${doc.sample.split('\n')[0]} (Vendor: ${doc.detectedVendor ?? 'N/A'}, Total: ${doc.detectedTotal ?? 'N/A'})\n`;
    }
  }

  let generatedCSV = '';
  if (input.actions.includes('make_csv')) {
    const header = [
      'filename',
      'chars',
      'words',
      'first_line',
      'detected_vendor',
      'detected_total',
    ].join(',');
    const rows = input.context.map((doc) => {
      const firstLine = doc.sample.split('\n')[0] ?? '';
      return [
        `"${doc.filename}"`,
        doc.sample.length,
        doc.wordCount,
        `"${firstLine.replace(/"/g, '""')}"`,
        `"${doc.detectedVendor ?? ''}"`,
        `"${doc.detectedTotal ?? ''}"`,
      ].join(',');
    });
    generatedCSV = header + '\n' + rows.join('\n');
  }

  return { generatedText, generatedCSV };
}

async function runScopedAction(req: Request, res: Response, next: NextFunction) {
  try {
    const payload: RunActionPayload = req.body;
    const userId = req.user.sub;
    const role = req.user.role;

    // -------------- Basic validation --------------
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ message: 'Request body required' });
    }

    if (!payload.scope || !payload.scope.type) {
      return res.status(400).json({ message: 'Scope.type is required' });
    }

    if (
      payload.scope.type === 'folder' &&
      (typeof (payload.scope as ScopeFolder).name !== 'string' ||
        !(payload.scope as ScopeFolder).name)
    ) {
      return res.status(400).json({ message: 'Folder scope must have a non-empty name' });
    }

    if (
      payload.scope.type === 'files' &&
      (!Array.isArray((payload.scope as ScopeFiles).ids) ||
        (payload.scope as ScopeFiles).ids.length === 0)
    ) {
      return res.status(400).json({ message: 'Files scope must have non-empty ids' });
    }

    // Ensure not mixing folder & files in same scope object
    if (payload.scope.type === 'folder' && 'ids' in payload.scope) {
      return res.status(400).json({ message: 'Scope type cannot have both folder and files' });
    }
    if (payload.scope.type === 'files' && 'name' in payload.scope) {
      return res.status(400).json({ message: 'Scope type cannot have both files and folder' });
    }

    // actions and messages
    if (
      !Array.isArray(payload.actions) ||
      payload.actions.length === 0 ||
      !payload.actions.every((a) => ['make_document', 'make_csv'].includes(a))
    ) {
      return res.status(400).json({ message: 'Invalid or empty actions array' });
    }

    if (
      !Array.isArray(payload.messages) ||
      payload.messages.length === 0 ||
      !payload.messages.some((m) => m.role === 'user' && typeof m.content === 'string')
    ) {
      return res.status(400).json({ message: 'Messages must include at least one user message' });
    }

    // RBAC double-check
    if (!['user', 'admin'].includes(role)) {
      return res.status(403).json({ message: 'Role not permitted to run actions' });
    }

    // -------------- Resolve documents based on scope --------------
    let documents: MongooseDocument[] = [];
    let primaryTagDoc: MongooseDocument | null = null;

    if (payload.scope.type === 'folder') {
      const folderName = (payload.scope as ScopeFolder).name;

      // find user's tag with that name (folder name)
      primaryTagDoc = await tagModel.findOne({ ownerId: userId, name: folderName }).exec();
      if (!primaryTagDoc) {
        return res.status(404).json({ message: 'Primary tag folder not found' });
      }

      // find documentTag entries where this tag is primary, then collect documentIds
      const docTags = await documentTagModel
        .find({
          tagId: primaryTagDoc._id,
          isPrimary: true,
        })
        .exec();

      const docIds = docTags.map((dt) => dt.documentId).filter(Boolean);
      if (!docIds.length) {
        return res.status(404).json({ message: 'No documents found for the folder/tag' });
      }

      // fetch documents owned by this user
      documents = await documentModel
        .find({
          _id: { $in: docIds },
          ownerId: userId,
        })
        .exec();
    } else {
      // files scope
      const ids = (payload.scope as ScopeFiles).ids;

      // Validate each id is a 24-char hex ObjectId
      const invalid = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
      if (invalid.length) {
        return res
          .status(400)
          .json({ message: 'One or more file ids are not valid ObjectIds', invalid });
      }
      const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));

      documents = await documentModel
        .find({
          _id: { $in: objectIds },
          ownerId: userId,
        })
        .exec();

      if (documents.length !== ids.length) {
        // some docs missing or not owned
        return res.status(404).json({ message: 'Some documents not found or not owned by user' });
      }

      // find-or-create user's "generated" tag to attach created results
      primaryTagDoc = await tagModel.findOne({ ownerId: userId, name: 'generated' }).exec();
      if (!primaryTagDoc) {
        primaryTagDoc = new tagModel({ ownerId: userId, name: 'generated', createdAt: new Date() });
        await primaryTagDoc.save();
      }
    }

    if (!documents || documents.length === 0) {
      return res.status(404).json({ message: 'No documents found in scope' });
    }

    // -------------- Build context and run mock processor --------------
    const context: any = buildContext(documents);

    // deterministic seed could be created if you want monthly stable results:
    // const seed = crypto.createHash("sha256").update(userId + JSON.stringify(payload.scope) + (new Date()).toISOString().slice(0,7)).digest("hex");

    const { generatedText, generatedCSV } = mockProcessor({
      messages: payload.messages,
      actions: payload.actions,
      context,
      // seed, // optional
    });

    // -------------- Persist generated documents (if any) --------------
    const createdDocs: MongooseDocument[] = [];
    const now = new Date();

    async function saveDocumentWithTag(
      filename: string,
      mime: string,
      textContent: string,
      primaryTagId: mongoose.Types.ObjectId,
    ): Promise<MongooseDocument> {
      const uploadDir = path.join(__dirname, '../../uploads', primaryTagId.toString());

      // Ensure the directory exists
      await fs.mkdirs(uploadDir);

      // Path of the file to save locally
      const filePath = path.join(uploadDir, filename);

      // Save the text content as a file to disk
      await fs.writeFile(filePath, textContent, 'utf-8');
      const doc = new documentModel({
        ownerId: userId,
        filename,
        mime,
        textContent,
        createdAt: now,
      });
      await doc.save();

      const docTag = new documentTagModel({
        documentId: doc._id,
        tagId: primaryTagId,
        isPrimary: true,
      });
      await docTag.save();

      return doc;
    }

    if (payload.actions.includes('make_document') && generatedText.length > 0) {
      const summaryFilename = `action_summary_${now.toISOString().replace(/[:.]/g, '-')}.txt`;
      const doc = await saveDocumentWithTag(
        summaryFilename,
        'text/plain',
        generatedText,
        primaryTagDoc!._id as mongoose.Types.ObjectId,
      );
      createdDocs.push(doc);
    }

    if (payload.actions.includes('make_csv') && generatedCSV.length > 0) {
      const csvFilename = `action_table_${now.toISOString().replace(/[:.]/g, '-')}.csv`;
      const doc = await saveDocumentWithTag(
        csvFilename,
        'text/csv',
        generatedCSV,
        primaryTagDoc!._id as mongoose.Types.ObjectId,
      );
      createdDocs.push(doc);
    }

    // -------------- Charge usage --------------
    await usageModel.create({
      userId: new mongoose.Types.ObjectId(req.user.sub),
      action: payload.actions[0] as string, // e.g. ['make_document', 'make_csv']
      creditsUsed: CREDIT_PER_RUN,
      createdAt: new Date(),
    });
    await userModel.updateOne(
      { _id: new mongoose.Types.ObjectId(req.user.sub) },
      { $inc: { credits: -CREDIT_PER_RUN } },
    );

    // -------------- Audit logs --------------
    const actionRunId = new mongoose.Types.ObjectId();
    await auditLogModel.create({
      at: now,
      userId,
      action: 'scoped_action', // align with assignment naming
      entityType: 'scoped',
      entityId: actionRunId,
      metadata: {
        scope: payload.scope,
        actions: payload.actions,
        createdDocIds: createdDocs.map((d) => (d._id as mongoose.Types.ObjectId).toString()),
      },
    });

    // audit each created doc
    if (createdDocs.length) {
      const audits = createdDocs.map((d) => ({
        at: now,
        userId,
        action: 'upload_doc', // align with assignment action names
        entityType: 'document',
        entityId: d._id,
        metadata: { via: 'actions.run', mime: (d as any).mime, scope: payload.scope },
      }));
      await auditLogModel.insertMany(audits);
    }

    // -------------- Response --------------
    return res.status(200).json({
      created: createdDocs.map((d) => ({
        id: (d._id as mongoose.Types.ObjectId).toString(),
        filename: typeof d.get === 'function' ? d.get('filename') : (d as any).filename,
        mime: typeof d.get === 'function' ? d.get('mime') : (d as any).mime,
      })),
      credits_charged: CREDIT_PER_RUN,
      warnings: [],
    });
  } catch (err) {
    console.error('Error in runAction:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

const getMonthlyUsage = async (req: Request, res: Response) => {
  try {
    const user = req.user as { sub: string; role: string; email: string };
    const now = new Date();

    //  Determine start & end of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    //  Match condition based on role
    const match: Record<string, any> = {
      createdAt: { $gte: startOfMonth, $lt: endOfMonth },
    };

    // normal users only see their own usage
    if (user.role === 'user' || user.role === 'support' || user.role === 'moderator') {
      match.userId = new mongoose.Types.ObjectId(user.sub);
    }

    //  Aggregate monthly totals
    const usageStats = await usageModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$userId',
          totalCreditsUsed: { $sum: '$creditsUsed' },
          actionsBreakdown: {
            $push: {
              action: '$action',
              creditsUsed: '$creditsUsed',
              createdAt: '$createdAt',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          email: { $arrayElemAt: ['$user.email', 0] },
          role: { $arrayElemAt: ['$user.role', 0] },
          totalCreditsUsed: 1,
          actionsBreakdown: 1,
        },
      },
      { $sort: { totalCreditsUsed: -1 } },
    ]);

    // Response
    return res.status(200).json({
      month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      totalUsers: usageStats.length,
      usage: usageStats,
    });
  } catch (err) {
    console.error('getMonthlyUsage error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export default {
  runScopedAction,
  getMonthlyUsage,
};
