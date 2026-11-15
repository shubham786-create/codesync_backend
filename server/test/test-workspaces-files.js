import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Workspace } from '../src/models/Workspace.js';
import { WorkspaceMember } from '../src/models/WorkspaceMember.js';
import { WorkspaceFile } from '../src/models/WorkspaceFile.js';
import bcrypt from 'bcryptjs';

async function testWorkspacesAndFiles() {
  console.log('[Test] Connecting to MongoDB...');
  await connectDB();
  await WorkspaceFile.deleteMany({});
  await WorkspaceFile.init();

  // Create test user
  const email = `ws_test_${Date.now()}@codesync.dev`;
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Secret123!', salt);
  const user = await User.create({ name: 'WS Dev', email, passwordHash });
  console.log(`[Test] Created user: ${user._id}`);

  // 1. Create Workspace
  const ws = await Workspace.create({ name: 'Alpha Workspace', ownerId: user._id });
  await WorkspaceMember.create({ workspaceId: ws._id, userId: user._id, role: 'owner' });
  console.log(`[Test] Created workspace: ${ws.name}`);

  // 2. Seed starter files
  const htmlFile = await WorkspaceFile.create({
    workspaceId: ws._id,
    parentId: null,
    name: 'index.html',
    type: 'file',
    path: '/index.html',
    content: '<h1>Hello</h1>',
    extension: 'html',
  });
  console.log(`[Test] Created file: ${htmlFile.path}`);

  // 3. Create folder
  const folder = await WorkspaceFile.create({
    workspaceId: ws._id,
    parentId: null,
    name: 'components',
    type: 'folder',
    path: '/components',
  });
  console.log(`[Test] Created folder: ${folder.path}`);

  // 4. Create nested file
  const nestedFile = await WorkspaceFile.create({
    workspaceId: ws._id,
    parentId: folder._id,
    name: 'Button.jsx',
    type: 'file',
    path: '/components/Button.jsx',
    content: 'export default function Button() {}',
    extension: 'jsx',
  });
  console.log(`[Test] Created nested file: ${nestedFile.path}`);

  // 5. Test sibling collision
  try {
    await WorkspaceFile.create({
      workspaceId: ws._id,
      parentId: folder._id,
      name: 'Button.jsx',
      type: 'file',
      path: '/components/Button.jsx',
    });
    throw new Error('Collision failed to trigger error!');
  } catch (err) {
    if (err.code === 11000) {
      console.log('[Test] Sibling name collision correctly rejected with 11000.');
    } else {
      throw err;
    }
  }

  // 6. Test folder rename and path cascade
  folder.name = 'ui';
  folder.path = '/ui';
  await folder.save();

  // Check children update
  nestedFile.path = `/ui/${nestedFile.name}`;
  await nestedFile.save();
  const reloadedNested = await WorkspaceFile.findById(nestedFile._id);
  if (reloadedNested.path !== '/ui/Button.jsx') {
    throw new Error(`Child path failed to update: ${reloadedNested.path}`);
  }
  console.log(`[Test] Folder and child path updated successfully to ${reloadedNested.path}`);

  // 7. Cleanup
  await WorkspaceFile.deleteMany({ workspaceId: ws._id });
  await WorkspaceMember.deleteMany({ workspaceId: ws._id });
  await Workspace.deleteOne({ _id: ws._id });
  await User.deleteOne({ _id: user._id });
  console.log('[Test] Cleaned up workspace and test entities.');

  await mongoose.disconnect();
  console.log('[Test] Workspace & File System tests PASSED!');
}

testWorkspacesAndFiles().catch((err) => {
  console.error('[Test Failed]', err);
  process.exit(1);
});
