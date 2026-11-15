import { Message } from '../models/Message.js';

export async function getMessages(req, res, next) {
  try {
    const workspaceId = req.workspace._id;
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const messages = await Message.find({ workspaceId })
      .sort({ createdAt: -1 })
      .limit(limit);

    // Return in chronological order
    res.status(200).json({
      messages: messages.reverse().map((m) => ({
        id: m._id.toString(),
        senderId: m.senderId.toString(),
        senderName: m.senderName,
        senderColor: m.senderColor,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}
