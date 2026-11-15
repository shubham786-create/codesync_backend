import mongoose from 'mongoose';

const collaborativeDocumentSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkspaceFile',
      required: true,
      unique: true,
      index: true,
    },
    yjsState: {
      type: Buffer,
      required: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    lastSavedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const CollaborativeDocument = mongoose.model(
  'CollaborativeDocument',
  collaborativeDocumentSchema
);
