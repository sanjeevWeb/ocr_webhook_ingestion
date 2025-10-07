import mongoose, { Types } from 'mongoose';
import tagModel from '../models/tag.model.js';
import documentModel from '../models/document.model.js';
import documentTagModel from '../models/documentTag.model.js';
import auditLogModel from '../models/auditLog.model.js';
import type { Request, Response } from 'express';

export class DocService {
  /**
   * Create a new document with primary and secondary tags.
   */
  // static async createDocumentWithTags(params: {
  //   ownerId: string;
  //   filename: string;
  //   mime: string;
  //   buffer: Buffer;
  //   textContent?: string | undefined;
  //   primaryTag: string;
  //   secondaryTags?: string[];
  // }) {
  //   const session = await mongoose.startSession();
  //   session.startTransaction();

  //   try {
  //     // Validate primary tag ownership
  //     const primaryTagDoc = await tagModel
  //       .findOne({
  //         _id: params.primaryTag,
  //         ownerId: params.ownerId,
  //       })
  //       .session(session);
  //     if (!primaryTagDoc) throw new Error('Primary tag not found or not owned by user');

  //     // Validate secondary tags ownership (optional)
  //     if (params.secondaryTags?.length) {
  //       const validSecondaryCount = await tagModel
  //         .countDocuments({
  //           _id: { $in: params.secondaryTags },
  //           ownerId: params.ownerId,
  //         })
  //         .session(session);
  //       if (validSecondaryCount !== params.secondaryTags.length)
  //         throw new Error('One or more secondary tags invalid or not owned by user');
  //     }

  //     // TODO: Save file buffer somewhere or store buffer in DB (not recommended for large files)
  //     // For demo, assume you store filename, mime, textContent; file handling depends on your storage

  //     // Create Document
  //     const [doc]: any = await documentModel.create(
  //       [
  //         {
  //           ownerId: params.ownerId,
  //           filename: params.filename,
  //           mime: params.mime,
  //           textContent: params.textContent || '',
  //           // You might want to store file path or S3 key instead of buffer
  //           // e.g. filePath: savedFilePath
  //         },
  //       ],
  //       { session },
  //     );

  //     // Create DocumentTag entry for primary tag
  //     await documentTagModel.create(
  //       [
  //         {
  //           documentId: doc._id,
  //           tagId: params.primaryTag,
  //           isPrimary: true,
  //         },
  //       ],
  //       { session },
  //     );

  //     // Create DocumentTag entries for secondary tags (if any)
  //     if (params.secondaryTags?.length) {
  //       const secondaryMap = params.secondaryTags?.map((tagId) => ({
  //         documentId: doc._id,
  //         tagId,
  //         isPrimary: false,
  //       }));
  //       await documentTagModel.insertMany(secondaryMap, { session });
  //     }

  //     await session.commitTransaction();
  //     session.endSession();

  //     return doc;
  //   } catch (err) {
  //     await session.abortTransaction();
  //     session.endSession();
  //     throw err;
  //   }
  // }

  static async createDocumentWithTags(params: {
    ownerId: string;
    filename: string;
    mime: string;
    buffer: Buffer;
    textContent?: string;
    primaryTag: string;
    secondaryTags?: string[];
  }) {
    try {
      //  Validate primary tag ownership
      const primaryTagDoc = await tagModel.findOne({
        _id: params.primaryTag,
        ownerId: params.ownerId,
      });

      if (!primaryTagDoc) {
        throw new Error('Primary tag not found or not owned by user');
      }

      //  Validating secondary tags ownership
      if (params.secondaryTags?.length) {
        const validSecondaryCount = await tagModel.countDocuments({
          _id: { $in: params.secondaryTags },
          ownerId: params.ownerId,
        });

        if (validSecondaryCount !== params.secondaryTags.length) {
          throw new Error('One or more secondary tags invalid or not owned by user');
        }
      }

      //  Create document entry
      const doc = await documentModel.create({
        ownerId: params.ownerId,
        filename: params.filename,
        mime: params.mime,
        textContent: params.textContent || '',
      });

      //  Link document with primary tag
      await documentTagModel.create({
        documentId: doc._id,
        tagId: params.primaryTag,
        isPrimary: true,
      });

      // Link document with secondary tags (if any)
      if (params.secondaryTags?.length) {
        const secondaryMappings = params.secondaryTags.map((tagId) => ({
          documentId: doc._id,
          tagId,
          isPrimary: false,
        }));

        await documentTagModel.insertMany(secondaryMappings);
      }

      // Creating or updating auditlog entry
      await auditLogModel.updateOne(
        {
          userId: params.ownerId,
          action: 'upload_doc',
          entityType: 'document',
          entityId: doc._id,
        },
        {
          $set: {
            at: new Date(),
            metadata: {
              filename: params.filename,
              mime: params.mime,
              primaryTag: params.primaryTag,
              secondaryTags: params.secondaryTags || [],
            },
          },
        },
        { upsert: true },
      );

      // Return created document
      return doc ;
      
    } catch (err) {
      console.error('createDocumentWithTags error:', err);
      throw err;
    }
  }

  /**
   * List folders (primary tags) and document counts for a user.
   */
  static async listFolders(ownerId: string) {
    return documentTagModel.aggregate([
      //  Join with document collection to filter by owner
      {
        $lookup: {
          from: 'documents',
          localField: 'documentId',
          foreignField: '_id',
          as: 'doc',
        },
      },
      { $unwind: '$doc' },

      //  Match only documents owned by this user
      {
        $match: {
          'doc.ownerId': new mongoose.Types.ObjectId(ownerId),
          isPrimary: true, // only primary tags for folders
        },
      },

      //  Join with tags to get tag details
      {
        $lookup: {
          from: 'tags',
          localField: 'tagId',
          foreignField: '_id',
          as: 'tag',
        },
      },
      { $unwind: '$tag' },

      //  Group by tag (folder)
      {
        $group: {
          _id: '$tag._id',
          name: { $first: '$tag.name' },
          count: { $sum: 1 },
        },
      },

      //  Optionally sort alphabetically or by count
      { $sort: { name: 1 } },
    ]);
  }

  /**
   * List documents by primary tag
   */
  // static async listDocsByFolder(ownerId: string, tagId: string) {
  //   return documentModel.find({ ownerId, primaryTag: tagId });
  // }

  static async listDocsByFolder(ownerId: string, tagId: string) {
    return documentTagModel.aggregate([
      // Match only primary tag associations for this tag
      {
        $match: {
          tagId: new mongoose.Types.ObjectId(tagId),
          isPrimary: true,
        },
      },
      // Join with documents to get file details
      {
        $lookup: {
          from: 'documents',
          localField: 'documentId',
          foreignField: '_id',
          as: 'doc',
        },
      },
      { $unwind: '$doc' },
      // Filter documents by owner
      {
        $match: {
          'doc.ownerId': new mongoose.Types.ObjectId(ownerId),
        },
      },
      // Optionally, lookup tag info too (if you want folder metadata)
      {
        $lookup: {
          from: 'tags',
          localField: 'tagId',
          foreignField: '_id',
          as: 'tag',
        },
      },
      { $unwind: '$tag' },
      // Shape the final output
      {
        $project: {
          _id: '$doc._id',
          filename: '$doc.filename',
          mime: '$doc.mime',
          textContent: '$doc.textContent',
          tagName: '$tag.name',
          createdAt: '$doc.createdAt',
        },
      },
    ]);
  }

  /**
   * Simple search by textContent
   */
  static async searchDocs(ownerId: string, query: string) {
    return documentModel.find({
      ownerId,
      textContent: { $regex: query, $options: 'i' },
    });
  }
}
