import http from 'http';
import { app, server } from './src/server.js';
import mongoose from 'mongoose';
import { User } from './src/models/User.js';

async function runApiTest() {
  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const port = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${port}`;
  const testEmail = `api_user_${Date.now()}@codesync.dev`;
  const testPassword = 'SecurePassword123!';
  const testName = 'API Tester';

  console.log(`[API Test] 1. Testing Registration for ${testEmail}...`);
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: testName, email: testEmail, password: testPassword }),
  });

  if (regRes.status !== 201) {
    const text = await regRes.text();
    throw new Error(`Registration failed with status ${regRes.status}: ${text}`);
  }

  const setCookie = regRes.headers.get('set-cookie');
  if (!setCookie || !setCookie.includes('codesync_token')) {
    throw new Error('Registration did not return codesync_token cookie!');
  }
  const tokenCookie = setCookie.split(';')[0];
  console.log('[API Test] Registration succeeded and set-cookie received.');

  console.log('[API Test] 2. Testing /api/auth/me with auth cookie...');
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: tokenCookie },
  });

  if (meRes.status !== 200) {
    throw new Error(`/api/auth/me failed with status ${meRes.status}`);
  }
  const meData = await meRes.json();
  if (meData.user.email !== testEmail || meData.user.name !== testName) {
    throw new Error('User profile data does not match registration info!');
  }
  console.log('[API Test] /api/auth/me returned correct user profile:', meData.user.email);

  console.log('[API Test] 3. Testing /api/auth/me WITHOUT cookie (should be 401)...');
  const unauthRes = await fetch(`${baseUrl}/api/auth/me`);
  if (unauthRes.status !== 401) {
    throw new Error(`Expected 401 Unauthorized, got ${unauthRes.status}`);
  }
  console.log('[API Test] Unauthenticated request correctly rejected with 401.');

  console.log('[API Test] 4. Testing Login endpoint...');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed with status ${loginRes.status}`);
  }
  console.log('[API Test] Login succeeded.');

  console.log('[API Test] 5. Testing Logout...');
  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
  });
  if (logoutRes.status !== 200) {
    throw new Error(`Logout failed with status ${logoutRes.status}`);
  }
  console.log('[API Test] Logout succeeded.');

  // Cleanup
  await User.deleteOne({ email: testEmail });
  console.log('[API Test] Database cleaned up.');
  console.log('[API Test] ALL AUTH API ENDPOINTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runApiTest().catch((err) => {
  console.error('[API Test Failed]', err);
  process.exit(1);
});
