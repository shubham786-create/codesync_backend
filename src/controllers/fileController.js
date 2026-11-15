import { WorkspaceFile } from '../models/WorkspaceFile.js';

// Helper to recursively update descendant paths after rename/move
async function updateDescendantPaths(folderId, newParentPath) {
  const children = await WorkspaceFile.find({ parentId: folderId });
  for (const child of children) {
    const childPath = `${newParentPath}/${child.name}`;
    child.path = childPath;
    await child.save();
    if (child.type === 'folder') {
      await updateDescendantPaths(child._id, childPath);
    }
  }
}

// Helper to collect all descendant IDs for recursive deletion
async function collectDescendantIds(folderId) {
  let ids = [folderId];
  const children = await WorkspaceFile.find({ parentId: folderId });
  for (const child of children) {
    if (child.type === 'folder') {
      const nested = await collectDescendantIds(child._id);
      ids = ids.concat(nested);
    } else {
      ids.push(child._id);
    }
  }
  return ids;
}

export async function listFiles(req, res, next) {
  try {
    const workspaceId = req.workspace._id;
    const files = await WorkspaceFile.find({ workspaceId }).sort({ type: -1, name: 1 });

    res.status(200).json({
      files: files.map((f) => ({
        id: f._id.toString(),
        _id: f._id.toString(),
        workspaceId: f.workspaceId.toString(),
        parentId: f.parentId ? f.parentId.toString() : null,
        name: f.name,
        type: f.type,
        path: f.path,
        extension: f.extension,
        updatedAt: f.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function getFile(req, res, next) {
  try {
    const { fileId } = req.params;
    const workspaceId = req.workspace._id;

    const file = await WorkspaceFile.findOne({ _id: fileId, workspaceId });
    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    res.status(200).json({
      file: {
        id: file._id.toString(),
        _id: file._id.toString(),
        workspaceId: file.workspaceId.toString(),
        parentId: file.parentId ? file.parentId.toString() : null,
        name: file.name,
        type: file.type,
        path: file.path,
        content: file.content,
        extension: file.extension,
        updatedAt: file.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createFile(req, res, next) {
  try {
    const workspaceId = req.workspace._id;
    const { parentId = null, name, type = 'file', content = '' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'File or folder name is required.' });
    }

    const trimmedName = name.trim();

    // Determine parent path
    let parentPath = '';
    let validatedParentId = null;

    if (parentId) {
      const parentFolder = await WorkspaceFile.findOne({
        _id: parentId,
        workspaceId,
        type: 'folder',
      });
      if (!parentFolder) {
        return res.status(400).json({ error: 'Specified parent folder does not exist.' });
      }
      parentPath = parentFolder.path;
      validatedParentId = parentFolder._id;
    }

    const computedPath = parentPath ? `${parentPath}/${trimmedName}` : `/${trimmedName}`;

    // Check sibling duplicate
    const existing = await WorkspaceFile.findOne({
      workspaceId,
      parentId: validatedParentId,
      name: trimmedName,
    });
    if (existing) {
      return res.status(409).json({
        error: `A ${existing.type} named '${trimmedName}' already exists in this directory.`,
      });
    }

    const extension = type === 'file' ? trimmedName.split('.').pop() || '' : '';

    const newFile = await WorkspaceFile.create({
      workspaceId,
      parentId: validatedParentId,
      name: trimmedName,
      type,
      path: computedPath,
      content: type === 'file' ? content : '',
      extension,
    });

    res.status(201).json({
      message: `${type === 'file' ? 'File' : 'Folder'} created successfully`,
      file: {
        id: newFile._id.toString(),
        _id: newFile._id.toString(),
        workspaceId: newFile.workspaceId.toString(),
        parentId: newFile.parentId ? newFile.parentId.toString() : null,
        name: newFile.name,
        type: newFile.type,
        path: newFile.path,
        content: newFile.content,
        extension: newFile.extension,
        updatedAt: newFile.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateFile(req, res, next) {
  try {
    const { fileId } = req.params;
    const workspaceId = req.workspace._id;
    const { name, content } = req.body;

    const file = await WorkspaceFile.findOne({ _id: fileId, workspaceId });
    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    // Handle content update
    if (typeof content === 'string') {
      file.content = content;
    }

    // Handle rename
    if (name && name.trim() && name.trim() !== file.name) {
      const trimmedName = name.trim();

      // Check collision with siblings
      const collision = await WorkspaceFile.findOne({
        workspaceId,
        parentId: file.parentId,
        name: trimmedName,
        _id: { $ne: file._id },
      });
      if (collision) {
        return res.status(409).json({
          error: `A ${collision.type} named '${trimmedName}' already exists in this folder.`,
        });
      }

      file.name = trimmedName;

      // Recompute path
      let parentPath = '';
      if (file.parentId) {
        const parent = await WorkspaceFile.findById(file.parentId);
        if (parent) parentPath = parent.path;
      }
      const newPath = parentPath ? `${parentPath}/${trimmedName}` : `/${trimmedName}`;
      file.path = newPath;

      if (file.type === 'file') {
        file.extension = trimmedName.split('.').pop() || '';
      } else {
        // If folder was renamed, update all recursive descendant paths!
        await updateDescendantPaths(file._id, newPath);
      }
    }

    await file.save();

    res.status(200).json({
      message: 'File updated successfully',
      file: {
        id: file._id.toString(),
        _id: file._id.toString(),
        workspaceId: file.workspaceId.toString(),
        parentId: file.parentId ? file.parentId.toString() : null,
        name: file.name,
        type: file.type,
        path: file.path,
        content: file.content,
        extension: file.extension,
        updatedAt: file.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteFile(req, res, next) {
  try {
    const { fileId } = req.params;
    const workspaceId = req.workspace._id;

    const file = await WorkspaceFile.findOne({ _id: fileId, workspaceId });
    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    if (file.type === 'folder') {
      // Recursively delete all children
      const allIds = await collectDescendantIds(file._id);
      await WorkspaceFile.deleteMany({ _id: { $in: allIds } });
    } else {
      await WorkspaceFile.deleteOne({ _id: file._id });
    }

    res.status(200).json({
      message: `${file.type === 'file' ? 'File' : 'Folder'} deleted successfully`,
      deletedId: fileId,
    });
  } catch (error) {
    next(error);
  }
}
