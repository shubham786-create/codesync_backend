import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderColor: {
      type: String,
      default: '#6366f1',
    },
    content: {
      type: String,
      required: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

messageSchema.index({ workspaceId: 1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
