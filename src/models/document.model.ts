// src/models/document.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IDocument extends Document {
  ownerId: Types.ObjectId;
  filename: string;
  mime: string;
  textContent: string;
  // primaryTag: Types.ObjectId;
  // secondaryTags: string[];
  createdAt: Date;
}

const documentSchema = new Schema<IDocument>({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  filename: { type: String, required: true },
  mime: { type: String, required: true },
  textContent: { type: String, default: '' },
  // primaryTag: { type: Schema.Types.ObjectId, ref: 'Tag', required: true },
  // secondaryTags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
  createdAt: { type: Date, default: Date.now },
});

export default model<IDocument>('Document', documentSchema);
