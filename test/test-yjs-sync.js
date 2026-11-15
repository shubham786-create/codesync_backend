import * as Y from 'yjs';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Workspace } from '../src/models/Workspace.js';
import { WorkspaceFile } from '../src/models/WorkspaceFile.js';
import { CollaborativeDocument } from '../src/models/CollaborativeDocument.js';
import { mongoYjsPersistence } from '../src/services/yjsPersistence.js';

async function testYjsCRDTSync() {
  console.log('[Yjs Test] 1. Connecting to MongoDB...');
  await connectDB();

  // Create workspace and file
  const testUser = await User.create({
    name: 'Yjs Tester',
    email: `yjs_${Date.now()}@codesync.dev`,
    passwordHash: 'dummy',
  });
  const ws = await Workspace.create({ name: 'CRDT Test Space', ownerId: testUser._id });
  const file = await WorkspaceFile.create({
    workspaceId: ws._id,
    parentId: null,
    name: 'test.js',
    type: 'file',
    path: '/test.js',
    content: 'console.log("initial");',
    extension: 'js',
  });

  const docName = `${ws._id}:${file._id}`;
  console.log(`[Yjs Test] 2. Initializing server Y.Doc for ${docName}...`);

  // Client A Y.Doc
  const ydocA = new Y.Doc();
  await mongoYjsPersistence.bindState(docName, ydocA);

  const textA = ydocA.getText('monaco');
  console.log(`[Yjs Test] Loaded initial text in Doc A: "${textA.toString()}"`);
  if (textA.toString() !== 'console.log("initial");') {
    throw new Error(`Initial text mismatch! Got: "${textA.toString()}"`);
  }

  // Client B Y.Doc
  const ydocB = new Y.Doc();
  // Sync Doc A state to Doc B
  const stateA = Y.encodeStateAsUpdate(ydocA);
  Y.applyUpdate(ydocB, stateA);
  const textB = ydocB.getText('monaco');

  console.log('[Yjs Test] 3. Simulating concurrent edits by Client A and Client B...');
  // Client A appends text
  ydocA.transact(() => {
    textA.insert(textA.length, '\n// Edit from Client A');
  });

  // Client B prepends text at the same time
  ydocB.transact(() => {
    textB.insert(0, '// Edit from Client B\n');
  });

  // Exchange updates (CRDT merge)
  const updateFromA = Y.encodeStateAsUpdate(ydocA);
  const updateFromB = Y.encodeStateAsUpdate(ydocB);

  Y.applyUpdate(ydocA, updateFromB);
  Y.applyUpdate(ydocB, updateFromA);

  console.log(`[Yjs Test] Result in Doc A:\n${textA.toString()}`);
  console.log(`[Yjs Test] Result in Doc B:\n${textB.toString()}`);

  if (textA.toString() !== textB.toString()) {
    throw new Error('CRDT convergence failed! Doc A and Doc B contents differ.');
  }
  console.log('[Yjs Test] Documents converged deterministically!');

  // Persist to MongoDB
  console.log('[Yjs Test] 4. Testing persistence to MongoDB CollaborativeDocument...');
  await mongoYjsPersistence.writeState(docName, ydocA);

  const savedCollabDoc = await CollaborativeDocument.findOne({ fileId: file._id });
  if (!savedCollabDoc || !savedCollabDoc.yjsState) {
    throw new Error('CollaborativeDocument was not saved to MongoDB!');
  }

  const updatedFile = await WorkspaceFile.findById(file._id);
  if (updatedFile.content !== textA.toString()) {
    throw new Error('WorkspaceFile content mirror was not updated!');
  }
  console.log('[Yjs Test] Both binary CRDT state and plain-text mirror saved to MongoDB.');

  // 5. Test recovery in a brand new clean Y.Doc instance (simulating server reboot)
  console.log('[Yjs Test] 5. Simulating server reboot recovery in a clean Y.Doc...');
  const rebootDoc = new Y.Doc();
  await mongoYjsPersistence.bindState(docName, rebootDoc);
  const rebootText = rebootDoc.getText('monaco');

  if (rebootText.toString() !== textA.toString()) {
    throw new Error('Server reboot recovery failed! Content differed.');
  }
  console.log('[Yjs Test] Rebooted Y.Doc recovered exact state perfectly!');

  // Cleanup
  await CollaborativeDocument.deleteOne({ fileId: file._id });
  await WorkspaceFile.deleteOne({ _id: file._id });
  await Workspace.deleteOne({ _id: ws._id });
  await User.deleteOne({ _id: testUser._id });
  await mongoose.disconnect();

  console.log('[Yjs Test] ALL YJS CRDT AND PERSISTENCE TESTS PASSED!');
}

testYjsCRDTSync().catch((err) => {
  console.error('[Yjs Test Failed]', err);
  process.exit(1);
});
