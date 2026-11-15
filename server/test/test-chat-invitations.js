import mongoose from 'mongoose';
import crypto from 'crypto';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Workspace } from '../src/models/Workspace.js';
import { WorkspaceMember } from '../src/models/WorkspaceMember.js';
import { Invitation } from '../src/models/Invitation.js';
import { Message } from '../src/models/Message.js';

async function testChatAndInvitations() {
  console.log('[Test] Connecting to MongoDB...');
  await connectDB();

  // Create Owner User
  const owner = await User.create({
    name: 'Workspace Owner',
    email: `owner_${Date.now()}@codesync.dev`,
    passwordHash: 'dummy',
  });

  // Create Invitee User
  const invitee = await User.create({
    name: 'New Collaborator',
    email: `collab_${Date.now()}@codesync.dev`,
    passwordHash: 'dummy',
  });

  // 1. Create Workspace
  const ws = await Workspace.create({ name: 'Collaboration Space', ownerId: owner._id });
  await WorkspaceMember.create({ workspaceId: ws._id, userId: owner._id, role: 'owner' });
  console.log(`[Test] Workspace created: ${ws.name}`);

  // 2. Generate Invitation
  const rawToken = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const invite = await Invitation.create({
    workspaceId: ws._id,
    inviterId: owner._id,
    tokenHash,
    role: 'editor',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  console.log(`[Test] Created invitation with role: ${invite.role}`);

  // 3. Accept Invitation
  const foundInvite = await Invitation.findOne({
    tokenHash,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });
  if (!foundInvite) throw new Error('Valid invitation not found!');

  const newMember = await WorkspaceMember.create({
    workspaceId: foundInvite.workspaceId,
    userId: invitee._id,
    role: foundInvite.role,
  });
  console.log(`[Test] Invitee joined workspace with role: ${newMember.role}`);

  // 4. Test Chat Message persistence
  const chatMsg = await Message.create({
    workspaceId: ws._id,
    senderId: invitee._id,
    senderName: invitee.name,
    senderColor: '#8b5cf6',
    content: 'Hello team, excited to collaborate in CodeSync!',
  });
  console.log(`[Test] Chat message created: "${chatMsg.content}"`);

  // 5. Test Chat Message query
  const history = await Message.find({ workspaceId: ws._id }).sort({ createdAt: -1 });
  if (history.length === 0 || history[0].content !== chatMsg.content) {
    throw new Error('Chat history query failed!');
  }
  console.log('[Test] Chat history queried successfully.');

  // Cleanup
  await Message.deleteMany({ workspaceId: ws._id });
  await Invitation.deleteMany({ workspaceId: ws._id });
  await WorkspaceMember.deleteMany({ workspaceId: ws._id });
  await Workspace.deleteOne({ _id: ws._id });
  await User.deleteMany({ _id: { $in: [owner._id, invitee._id] } });

  await mongoose.disconnect();
  console.log('[Test] Chat, Invitation & RBAC tests PASSED!');
}

testChatAndInvitations().catch((err) => {
  console.error('[Test Failed]', err);
  process.exit(1);
});
