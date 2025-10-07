// src/models/tag.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IdocumentTag extends Document {
  documentId: Types.ObjectId;
  tagId: Types.ObjectId;
  isPrimary: boolean;
  createdAt: Date;
}

const docTagSchema = new Schema<IdocumentTag>({
  documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
  tagId: { type: Schema.Types.ObjectId, ref: 'Tag', required: true },
  isPrimary: { type: Boolean, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default model<IdocumentTag>('DocumentTag', docTagSchema);
