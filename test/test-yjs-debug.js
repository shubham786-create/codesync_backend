import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../src/config/db.js';
import { WorkspaceFile } from '../src/models/WorkspaceFile.js';
import { Workspace } from '../src/models/Workspace.js';
import { User } from '../src/models/User.js';
import { mongoYjsPersistence, parseDocName } from '../src/services/yjsPersistence.js';
import * as Y from 'yjs';
import mongoose from 'mongoose';

async function testDebug() {
  await connectDB();
  
  // Find a recent workspace file
  const file = await WorkspaceFile.findOne();
  if (!file) {
    console.log('No file in DB yet.');
    process.exit(0);
  }

  console.log('Testing with file:', file._id.toString(), 'name:', file.name, 'content length:', file.content?.length);
  
  // Test various docName formats that client could send:
  const testDocNames = [
    `${file.workspaceId.toString()}:${file._id.toString()}`,
    `${file.workspaceId.toString()}%3A${file._id.toString()}`,
    `yjs/${file.workspaceId.toString()}:${file._id.toString()}`,
    `/yjs/${file.workspaceId.toString()}:${file._id.toString()}`,
  ];

  for (const docName of testDocNames) {
    console.log('\nTesting docName:', docName);
    const parsed = parseDocName(docName);
    console.log('Parsed:', parsed);
    console.log('IsValid ObjectId fileId?', mongoose.Types.ObjectId.isValid(parsed.fileId));

    const ydoc = new Y.Doc();
    await mongoYjsPersistence.bindState(docName, ydoc);
    const ytext = ydoc.getText('monaco');
    console.log('ytext length after bindState:', ytext.length);
  }

  await mongoose.disconnect();
}

testDebug().catch(console.error);
