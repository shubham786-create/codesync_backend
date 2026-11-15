import mongoose from 'mongoose';

const workspaceFileSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkspaceFile',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'File/folder name is required'],
      trim: true,
      validate: {
        validator: function (v) {
          // Disallow invalid characters and path traversal
          return !/[/\\:*?"<>|\x00]/.test(v) && v !== '.' && v !== '..';
        },
        message: 'Name contains invalid characters or path traversal sequences.',
      },
    },
    type: {
      type: String,
      enum: ['file', 'folder'],
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    extension: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness of sibling files/folders
workspaceFileSchema.index({ workspaceId: 1, parentId: 1, name: 1 }, { unique: true });

export const WorkspaceFile = mongoose.model('WorkspaceFile', workspaceFileSchema);
