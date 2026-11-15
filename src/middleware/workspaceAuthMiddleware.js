import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';

export function requireWorkspaceAccess(requiredRole = 'viewer') {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.workspaceId || req.params.id;
      const userId = req.user._id;

      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required.' });
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found.' });
      }

      // Check membership
      const member = await WorkspaceMember.findOne({ workspaceId, userId });
      if (!member) {
        return res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      }

      // Check role hierarchy: owner > editor > viewer
      const roleRank = { viewer: 1, editor: 2, owner: 3 };
      const userRank = roleRank[member.role] || 0;
      const targetRank = roleRank[requiredRole] || 1;

      if (userRank < targetRank) {
        return res.status(403).json({
          error: `Insufficient permissions. This operation requires '${requiredRole}' role.`,
        });
      }

      req.workspace = workspace;
      req.membership = member;
      next();
    } catch (error) {
      next(error);
    }
  };
}
