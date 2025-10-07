// src/models/tag.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  at: Date;
  userId: Types.ObjectId;
  action: 'upload_doc' | 'create_task' | 'webhook_ingest' | 'scoped_action';
  entityType: 'document' | 'tag' | 'task' | 'webhook' | 'scoped';
  entityId: Types.ObjectId;
  metadata: Record<string, unknown>;
}

const auditSchema = new Schema<IAuditLog>(
  {
    at: { type: Date, default: Date.now },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.Mixed},
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: false, // 'at' field is event time; disable auto timestamps
  },
);

export default model<IAuditLog>('AuditLog', auditSchema);
