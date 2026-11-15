import crypto from 'crypto';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { Workspace } from '../models/Workspace.js';
import { Invitation } from '../models/Invitation.js';

export async function listMembers(req, res, next) {
  try {
    const workspaceId = req.workspace._id;

    const members = await WorkspaceMember.find({ workspaceId })
      .populate('userId', 'name email avatarColor')
      .sort({ joinedAt: 1 });

    res.status(200).json({
      members: members.map((m) => ({
        id: m._id.toString(),
        userId: m.userId?._id?.toString() || m.userId,
        name: m.userId?.name || 'Unknown',
        email: m.userId?.email || '',
        avatarColor: m.userId?.avatarColor || '#6366f1',
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function createInvitation(req, res, next) {
  try {
    const workspaceId = req.workspace._id;
    const inviterId = req.user._id;
    const { role = 'editor' } = req.body;

    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either editor or viewer.' });
    }

    // Generate random 24-byte hex token
    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 7 days expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await Invitation.create({
      workspaceId,
      inviterId,
      tokenHash,
      role,
      expiresAt,
    });

    const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const inviteUrl = `${clientOrigin}/join/${rawToken}`;

    res.status(201).json({
      message: 'Invitation link generated',
      token: rawToken,
      inviteUrl,
      role,
      expiresAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function acceptInvitation(req, res, next) {
  try {
    const { token } = req.params;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({ error: 'Invitation token is required.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invitation = await Invitation.findOne({
      tokenHash,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation link is invalid, expired, or has been revoked.' });
    }

    const workspace = await Workspace.findById(invitation.workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'The workspace associated with this invitation no longer exists.' });
    }

    // Check if already a member
    let member = await WorkspaceMember.findOne({
      workspaceId: workspace._id,
      userId,
    });

    if (!member) {
      member = await WorkspaceMember.create({
        workspaceId: workspace._id,
        userId,
        role: invitation.role,
      });
    }

    res.status(200).json({
      message: 'Successfully joined workspace',
      workspaceId: workspace._id.toString(),
      role: member.role,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMemberRole(req, res, next) {
  try {
    const { targetUserId } = req.params;
    const { role } = req.body;
    const workspaceId = req.workspace._id;

    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be editor or viewer.' });
    }

    // Check if target is workspace owner
    if (req.workspace.ownerId.toString() === targetUserId) {
      return res.status(400).json({ error: 'Cannot change the role of the workspace owner.' });
    }

    const member = await WorkspaceMember.findOneAndUpdate(
      { workspaceId, userId: targetUserId },
      { role },
      { new: true }
    );

    if (!member) {
      return res.status(404).json({ error: 'Member not found in workspace.' });
    }

    res.status(200).json({ message: 'Member role updated successfully', member });
  } catch (error) {
    next(error);
  }
}

export async function removeMember(req, res, next) {
  try {
    const { targetUserId } = req.params;
    const workspaceId = req.workspace._id;
    const currentUserId = req.user._id.toString();

    // Only owner can remove others, or user can remove themselves
    const isOwner = req.membership.role === 'owner';
    const isSelf = currentUserId === targetUserId;

    if (!isOwner && !isSelf) {
      return res.status(403).json({ error: 'You do not have permission to remove this member.' });
    }

    // Cannot remove owner
    if (req.workspace.ownerId.toString() === targetUserId) {
      return res.status(400).json({ error: 'Cannot remove the owner of the workspace.' });
    }

    await WorkspaceMember.deleteOne({ workspaceId, userId: targetUserId });

    res.status(200).json({ message: 'Member removed successfully.' });
  } catch (error) {
    next(error);
  }
}
