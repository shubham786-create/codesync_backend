import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      minlength: [1, 'Workspace name cannot be empty'],
      maxlength: [60, 'Workspace name cannot exceed 60 characters'],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    settings: {
      tabSize: { type: Number, default: 2 },
      fontSize: { type: Number, default: 14 },
      theme: { type: String, default: 'vs-dark' },
      wordWrap: { type: String, default: 'on', enum: ['on', 'off', 'wordWrapColumn', 'bounded'] },
    },
  },
  {
    timestamps: true,
  }
);

export const Workspace = mongoose.model('Workspace', workspaceSchema);
