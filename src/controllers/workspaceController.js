import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { WorkspaceFile } from '../models/WorkspaceFile.js';
import { DEFAULT_FILES } from '../../../../shared/index.js';

export async function listWorkspaces(req, res, next) {
  try {
    const userId = req.user._id;

    // Find memberships for current user
    const memberships = await WorkspaceMember.find({ userId });
    const workspaceIds = memberships.map((m) => m.workspaceId);

    // Fetch workspaces populated with owner details
    const workspaces = await Workspace.find({ _id: { $in: workspaceIds } })
      .populate('ownerId', 'name email avatarColor')
      .sort({ updatedAt: -1 });

    // Map roles to workspaces
    const roleMap = new Map();
    memberships.forEach((m) => roleMap.set(m.workspaceId.toString(), m.role));

    // Get member counts
    const memberCounts = await WorkspaceMember.aggregate([
      { $match: { workspaceId: { $in: workspaceIds } } },
      { $group: { _id: '$workspaceId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map();
    memberCounts.forEach((c) => countMap.set(c._id.toString(), c.count));

    const result = workspaces.map((ws) => {
      const idStr = ws._id.toString();
      return {
        id: idStr,
        _id: idStr,
        name: ws.name,
        description: ws.description,
        owner: ws.ownerId,
        role: roleMap.get(idStr) || 'viewer',
        memberCount: countMap.get(idStr) || 1,
        settings: ws.settings,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
      };
    });

    res.status(200).json({ workspaces: result });
  } catch (error) {
    next(error);
  }
}

export async function createWorkspace(req, res, next) {
  try {
    const { name, description, template = 'starter' } = req.body;
    const userId = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Workspace name is required.' });
    }

    const workspace = await Workspace.create({
      name: name.trim(),
      description: description?.trim() || '',
      ownerId: userId,
    });

    // Add creator as owner member
    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId,
      role: 'owner',
    });

    // Seed starter files if requested
    if (template === 'starter') {
      const filesToCreate = DEFAULT_FILES.map((f) => ({
        workspaceId: workspace._id,
        parentId: null,
        name: f.name,
        type: f.type,
        path: f.path,
        content: f.content,
        extension: f.name.split('.').pop() || '',
      }));
      await WorkspaceFile.insertMany(filesToCreate);
    }

    res.status(201).json({
      message: 'Workspace created successfully',
      workspace: {
        id: workspace._id.toString(),
        _id: workspace._id.toString(),
        name: workspace.name,
        description: workspace.description,
        owner: req.user.toSafeObject(),
        role: 'owner',
        memberCount: 1,
        settings: workspace.settings,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getWorkspace(req, res, next) {
  try {
    const workspace = await Workspace.findById(req.workspace._id).populate(
      'ownerId',
      'name email avatarColor'
    );

    const members = await WorkspaceMember.find({ workspaceId: workspace._id })
      .populate('userId', 'name email avatarColor')
      .sort({ joinedAt: 1 });

    res.status(200).json({
      workspace: {
        id: workspace._id.toString(),
        _id: workspace._id.toString(),
        name: workspace.name,
        description: workspace.description,
        owner: workspace.ownerId,
        role: req.membership.role,
        settings: workspace.settings,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
        members: members.map((m) => ({
          id: m._id.toString(),
          user: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateWorkspace(req, res, next) {
  try {
    const { name, description, settings } = req.body;
    const workspace = req.workspace;

    if (name && name.trim()) {
      workspace.name = name.trim();
    }
    if (typeof description === 'string') {
      workspace.description = description.trim();
    }
    if (settings) {
      workspace.settings = { ...workspace.settings, ...settings };
    }

    await workspace.save();

    res.status(200).json({
      message: 'Workspace updated successfully',
      workspace,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteWorkspace(req, res, next) {
  try {
    const workspaceId = req.workspace._id;

    // Delete workspace and all associated entities
    await Promise.all([
      Workspace.deleteOne({ _id: workspaceId }),
      WorkspaceMember.deleteMany({ workspaceId }),
      WorkspaceFile.deleteMany({ workspaceId }),
    ]);

    res.status(200).json({ message: 'Workspace deleted successfully.' });
  } catch (error) {
    next(error);
  }
}
