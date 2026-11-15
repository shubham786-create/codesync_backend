import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { User } from './src/models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

async function testAuth() {
  console.log('[Test] Connecting to MongoDB...');
  await connectDB();

  const testEmail = `testuser_${Date.now()}@codesync.dev`;
  const testPassword = 'Password123!';
  const testName = 'Test Developer';

  console.log(`[Test] Creating user with email: ${testEmail}`);
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(testPassword, salt);
  const user = await User.create({
    name: testName,
    email: testEmail,
    passwordHash,
  });

  console.log(`[Test] User created with ID: ${user._id}`);
  const safeObj = user.toSafeObject();
  if (safeObj.passwordHash) {
    throw new Error('Security flaw: passwordHash is exposed in toSafeObject()!');
  }
  console.log('[Test] Password hash is properly omitted from safe object.');

  console.log('[Test] Testing password verification...');
  const isMatch = await user.comparePassword(testPassword);
  if (!isMatch) throw new Error('Password compare failed for valid password!');
  const isBadMatch = await user.comparePassword('WrongPassword');
  if (isBadMatch) throw new Error('Password compare accepted invalid password!');
  console.log('[Test] Password verification works correctly.');

  console.log('[Test] Testing duplicate email rejection...');
  try {
    await User.create({
      name: 'Another User',
      email: testEmail,
      passwordHash: 'dummy',
    });
    throw new Error('Duplicate email was not rejected!');
  } catch (err) {
    if (err.code === 11000) {
      console.log('[Test] Duplicate email rejected with code 11000 as expected.');
    } else {
      throw err;
    }
  }

  console.log('[Test] Testing JWT generation & verification...');
  const secret = process.env.JWT_SECRET || 'super-secret-codesync-jwt-token-change-in-production';
  const token = jwt.sign({ userId: user._id.toString() }, secret, { expiresIn: '7d' });
  const decoded = jwt.verify(token, secret);
  if (decoded.userId !== user._id.toString()) {
    throw new Error('JWT decoded userId mismatch!');
  }
  console.log('[Test] JWT generated and verified successfully.');

  // Clean up
  await User.deleteOne({ _id: user._id });
  console.log('[Test] Cleaned up test user.');
  await mongoose.disconnect();
  console.log('[Test] Phase 2 Auth Unit & Integration Tests PASSED!');
}

testAuth().catch((err) => {
  console.error('[Test Failed]', err);
  process.exit(1);
});
