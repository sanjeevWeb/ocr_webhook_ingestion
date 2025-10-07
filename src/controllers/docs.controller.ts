// src/controllers/docs.controller.ts
import type { Request, Response } from 'express';
import { DocService } from '../services/doc.service.js';
import documentModel from '../models/document.model.js';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_ROOT = path.join(__dirname, '../../uploads/'); 

// const uploadDoc = async (req: Request, res: Response) => {
//   try {
//     const { filename, mime, textContent, primaryTag, secondaryTags } = req.body;

//     if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

//     const doc = await DocService.createDocument({
//       ownerId: req.user.sub,
//       filename,
//       mime,
//       textContent,
//       primaryTag,
//       secondaryTags,
//     });

//     res.status(201).json({ message: 'Document uploaded', doc });
//   } catch (err) {
//     if (err instanceof Error) res.status(400).json({ message: err.message });
//     else res.status(400).json({ message: err });
//   }
// };

interface UploadDocBody {
  primaryTag: string;
  secondaryTags?: string | string[] | undefined;
  textContent?: string;
}

const uploadDoc = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const file = req.file;
    if (!file) return res.status(400).json({ message: 'File is required' });

    // Parse other form fields
    // Multer puts text form fields in req.body as strings
    const { primaryTag, secondaryTags, textContent } = req.body as UploadDocBody;

    if (!primaryTag) return res.status(400).json({ message: 'Primary tag is required' });

    // secondaryTags might be comma separated string or array (depends on client)
    let secondaryTagsArray: string[] | undefined;

    if (secondaryTags) {
      if (Array.isArray(secondaryTags)) {
        secondaryTagsArray = secondaryTags;
      } else if (typeof secondaryTags === 'string') {
        // e.g. "tagId1,tagId2"
        secondaryTagsArray = secondaryTags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
      }
    }
    // textContent: textContent ?? '',
    const createdDoc = await DocService.createDocumentWithTags({
      ownerId: req.user.sub,
      filename: file.originalname,
      mime: file.mimetype,
      buffer: file.buffer,
      textContent: textContent ?? '',
      primaryTag,
      secondaryTags: secondaryTagsArray ?? [],
    });

    res.status(201).json({ message: 'Document uploaded successfully', document: createdDoc, savedFile: req.savedFile });
  } catch (error) {
    console.error('Upload error:', error);
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

const listFolders = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const folders = await DocService.listFolders(req.user.sub);
  res.json(folders);
};

const listDocsByFolder = async (req: Request, res: Response) => {
  const { tag } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const docs = await DocService.listDocsByFolder(req.user.sub, tag as string);
  res.json(docs);
};

// const searchDocs = async (req: Request, res: Response) => {
//   try {
//     const { q, scope, ids } = req.query;

//     if (!q || typeof q !== 'string') {
//       return res.status(400).json({ message: 'Search query (q) is required' });
//     }

//     if (!scope || (scope !== 'folder' && scope !== 'files')) {
//       return res.status(400).json({ message: 'Invalid scope. Must be "folder" or "files".' });
//     }

//     if (!ids) {
//       return res.status(400).json({ message: 'ids[] parameter is required' });
//     }

//     const idList = Array.isArray(ids)
//       ? ids
//       : typeof ids === 'string'
//       ? ids.split(',')
//       : [];

//     if (idList.length === 0) {
//       return res.status(400).json({ message: 'At least one id is required.' });
//     }

//     const matchedFileIds: string[] = [];

//     // ========== SCOPE: folder ==========
//     if (scope === 'folder') {
//       for (const folderId of idList) {
//         const folderPath = path.join(DATA_ROOT, folderId as string);

//         try {
//           const files = await fs.readdir(folderPath);
//           for (const fileName of files) {
//             const filePath = path.join(folderPath, fileName);
//             const content = await fs.readFile(filePath, 'utf-8');
//             if (content.toLowerCase().includes(q.toLowerCase())) {
//               const fileId = path.parse(fileName).name; // remove .txt extension
//               matchedFileIds.push(fileId);
//             }
//           }
//         } catch (err) {
//           if(err instanceof Error)
//             console.warn(`Could not read folder ${folderId}:`, err.message);
//         }
//       }
//     }

//     // ========== SCOPE: files ==========
//     if (scope === 'files') {
//       for (const fileId of idList) {
//         // We don’t know which folder — search in all folders
//         const folders = await fs.readdir(DATA_ROOT);
//         for (const folderId of folders) {
//           const filePath = path.join(DATA_ROOT, folderId, `${fileId}.txt`);
//           try {
//             const content = await fs.readFile(filePath, 'utf-8');
//             if (content.toLowerCase().includes(q.toLowerCase())) {
//               matchedFileIds.push(String(fileId));
//               break; // found in one folder, skip rest
//             }
//           } catch {
//             // file not found in this folder — skip
//           }
//         }
//       }
//     }

//     if (matchedFileIds.length === 0) {
//       return res.json({ count: 0, results: [] });
//     }
//     const validIds = matchedFileIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

//     // Fetch metadata from Mongo
//     const docs = await documentModel.find({
//       _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(String(id))) },
//     }).lean();


//     // Add small snippet
//     // const results = [];
//     // for (const doc of docs) {
//     //   const folderPath = path.join(DATA_ROOT, String(doc.folderId));
//     //   const filePath = path.join(folderPath, `${doc._id}.txt`);

//     //   try {
//     //     const content = await fs.readFile(filePath, 'utf-8');
//     //     const index = content.toLowerCase().indexOf(q.toLowerCase());
//     //     const snippet =
//     //       index >= 0
//     //         ? content.substring(Math.max(0, index - 30), index + 70) + '...'
//     //         : '';

//     //     results.push({
//     //       id: doc._id,
//     //       name: doc.name,
//     //       folderId: doc.folderId,
//     //       snippet,
//     //       createdAt: doc.createdAt,
//     //     });
//     //   } catch {
//     //     results.push({
//     //       id: doc._id,
//     //       name: doc.name,
//     //       folderId: doc.folderId,
//     //       snippet: '',
//     //       createdAt: doc.createdAt,
//     //     });
//     //   }
//     // }

//     // return res.json({ count: results.length, results });
//     return res.json({ docs });
//   } catch (err: any) {
//     console.error('Search failed:', err);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// };

const searchDocs = async (req: Request, res: Response) => {
  try {
    const { q, scope, ids } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ message: 'Search query (q) is required' });
    }

    if (!scope || (scope !== 'folder' && scope !== 'files')) {
      return res.status(400).json({ message: 'Invalid scope. Must be "folder" or "files".' });
    }

    if (!ids) {
      return res.status(400).json({ message: 'ids[] parameter is required' });
    }

    const idList = Array.isArray(ids)
      ? ids
      : typeof ids === 'string'
      ? ids.split(',')
      : [];

    if (idList.length === 0) {
      return res.status(400).json({ message: 'At least one id is required.' });
    }

    const matchedFileIds: string[] = [];

    // ========== SCOPE: folder ==========
    if (scope === 'folder') {
      for (const folderId of idList) {
        const folderPath = path.join(DATA_ROOT, folderId as string);

        try {
          const files = await fs.readdir(folderPath);
          for (const fileName of files) {
            const filePath = path.join(folderPath, fileName);
            const content = await fs.readFile(filePath, 'utf-8');
            if (content.toLowerCase().includes(q.toLowerCase())) {
              const fileId = path.parse(fileName).name; // remove .txt extension
              matchedFileIds.push(fileId);
            }
          }
        } catch (err) {
          if (err instanceof Error)
            console.warn(`Could not read folder ${folderId}:`, err.message);
        }
      }
    }

    // ========== SCOPE: files ==========
    if (scope === 'files') {
      for (const fileId of idList) {
        // We don’t know which folder — search in all folders
        const folders = await fs.readdir(DATA_ROOT);
        for (const folderId of folders) {
          const filePath = path.join(DATA_ROOT, folderId, `${fileId}.txt`);
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            if (content.toLowerCase().includes(q.toLowerCase())) {
              matchedFileIds.push(fileId as string);
              break; // found in one folder, skip rest
            }
          } catch {
            // file not found in this folder — skip
          }
        }
      }
    }

    // if (matchedFileIds.length === 0) {
    //   return res.json({ count: 0, results: [] });
    // }

    return res.json({ matchedFileIds });
  } catch (err: any) {
    console.error('Search failed:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


export default {
  uploadDoc,
  listFolders,
  listDocsByFolder,
  searchDocs,
};
