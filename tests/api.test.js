import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../server/app.js';
import db, { initDb } from '../server/db/database.js';

let server;
let baseUrl;

before(async () => {
  initDb();
  db.prepare('DELETE FROM clicks').run();
  db.prepare('DELETE FROM urls').run();
  db.prepare('DELETE FROM users').run();

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  db.prepare('DELETE FROM clicks').run();
  db.prepare('DELETE FROM urls').run();
  db.prepare('DELETE FROM users').run();

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /health returns status ok', async () => {
  const res = await fetch(`${baseUrl}/health`);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.status, 'ok');
});

let guestShortCode = '';

test('POST /api/urls/shorten anonymously creates a short link with QR code', async () => {
  const res = await fetch(`${baseUrl}/api/urls/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originalUrl: 'https://news.ycombinator.com' })
  });

  const data = await res.json();
  assert.equal(res.status, 201);
  assert.ok(data.shortCode);
  assert.ok(data.shortUrl);
  assert.ok(data.qrCode.startsWith('data:image/png;base64,'));
  assert.equal(data.originalUrl, 'https://news.ycombinator.com/');
  assert.equal(data.isGuest, true);
  assert.equal(data.clicks, 0);

  guestShortCode = data.shortCode;
});

test('GET /:shortCode redirects with 302 to destination URL and tracks clicks', async () => {
  const res = await fetch(`${baseUrl}/${guestShortCode}`, {
    redirect: 'manual',
    headers: { 'User-Agent': 'TestBrowser/1.0' }
  });

  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), 'https://news.ycombinator.com/');

  // Verify click was recorded in database
  const urlRecord = db.prepare('SELECT clicks FROM urls WHERE short_code = ?').get(guestShortCode);
  assert.equal(urlRecord.clicks, 1);

  const clickRecords = db.prepare('SELECT * FROM clicks').all();
  assert.ok(clickRecords.length >= 1);
});

test('POST /api/urls/shorten rejects invalid URL format', async () => {
  const res = await fetch(`${baseUrl}/api/urls/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originalUrl: 'not-a-valid-url-domain' })
  });

  const data = await res.json();
  assert.equal(res.status, 400);
  assert.ok(data.error);
});

let authToken = '';
let createdUrlId = null;

test('POST /api/auth/register creates a new user and returns JWT token', async () => {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'alexdev',
      email: 'alex@example.com',
      password: 'password123'
    })
  });

  const data = await res.json();
  assert.equal(res.status, 201);
  assert.ok(data.token);
  assert.equal(data.user.username, 'alexdev');
  assert.equal(data.user.email, 'alex@example.com');

  authToken = data.token;
});

test('POST /api/auth/login logs in with valid credentials', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: 'alexdev',
      password: 'password123'
    })
  });

  const data = await res.json();
  assert.equal(res.status, 200);
  assert.ok(data.token);
  assert.equal(data.user.username, 'alexdev');
});

test('POST /api/auth/login rejects incorrect password', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: 'alexdev',
      password: 'wrongpassword'
    })
  });

  const data = await res.json();
  assert.equal(res.status, 401);
  assert.ok(data.error);
});

test('GET /api/auth/me returns authenticated user details and stats', async () => {
  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.user.username, 'alexdev');
  assert.ok(data.user.stats);
});

test('POST /api/urls/shorten allows custom alias for authenticated user', async () => {
  const res = await fetch(`${baseUrl}/api/urls/shorten`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      originalUrl: 'https://github.com',
      customSlug: 'my-custom-hub',
      title: 'My Custom Hub'
    })
  });

  const data = await res.json();
  assert.equal(res.status, 201);
  assert.equal(data.shortCode, 'my-custom-hub');
  assert.equal(data.title, 'My Custom Hub');
  assert.equal(data.isGuest, false);

  createdUrlId = data.id;
});

test('POST /api/urls/shorten prevents duplicate custom slugs', async () => {
  const res = await fetch(`${baseUrl}/api/urls/shorten`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      originalUrl: 'https://google.com',
      customSlug: 'my-custom-hub'
    })
  });

  const data = await res.json();
  assert.equal(res.status, 409);
  assert.ok(data.error.includes('already taken'));
});

test('GET /api/urls returns all URLs owned by the user', async () => {
  const res = await fetch(`${baseUrl}/api/urls`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const data = await res.json();
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(data.urls));
  assert.equal(data.urls.length, 1);
  assert.equal(data.urls[0].shortCode, 'my-custom-hub');
});

test('PATCH /api/urls/:id allows updating title and deactivating link', async () => {
  const res = await fetch(`${baseUrl}/api/urls/${createdUrlId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      title: 'Updated Hub Title',
      is_active: false
    })
  });

  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.url.title, 'Updated Hub Title');
  assert.equal(data.url.isActive, false);
});

test('GET /:shortCode returns 410 for deactivated link', async () => {
  const res = await fetch(`${baseUrl}/my-custom-hub`);
  assert.equal(res.status, 410);
});

test('DELETE /api/urls/:id removes the link', async () => {
  const res = await fetch(`${baseUrl}/api/urls/${createdUrlId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const data = await res.json();
  assert.equal(res.status, 200);

  // Verify deletion
  const checkRes = await fetch(`${baseUrl}/my-custom-hub`);
  assert.equal(checkRes.status, 404);
});
