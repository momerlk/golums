import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp, normalizePhone, validateProgress } from './app.js';

const valid = { email: 'student@lums.edu.pk', gender: 'female', discovered: ['landmark_A'], position: [1784, 7920], muted: false, biking: false, updatedAt: '2026-08-19T12:00:00.000Z' };
const phonePlayer = { ...valid, email: undefined, phone: '03000856955', username: 'Omer' };
const documents = new Map();
const players = {
  findOne: ({ _id }) => documents.get(_id) || null,
  replaceOne: ({ _id }, document) => { documents.set(_id, document); },
};
let server;
let baseUrl;

before(async () => {
  server = createApp(players).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('validates progress at the trust boundary', () => {
  assert.equal(validateProgress(valid)._id, 'student@lums.edu.pk');
  assert.equal(validateProgress({ ...valid, email: 'not-an-email' }), null);
  assert.equal(validateProgress({ ...valid, position: [-1, 4] }), null);
});

test('normalizes Pakistani phone identities', () => {
  assert.equal(normalizePhone('+92 300 0856955'), '+923000856955');
  assert.equal(validateProgress(phonePlayer)._id, '+923000856955');
  assert.equal(validateProgress({ ...phonePlayer, username: 'x' }), null);
});

test('email is the unique save and load identity', async () => {
  assert.equal((await fetch(`${baseUrl}/health`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/api/progress/load`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: valid.email }) })).status, 404);
  assert.equal((await fetch(`${baseUrl}/api/progress`, { method: 'PUT', headers: { 'content-type': 'application/json', origin: 'http://localhost' }, body: JSON.stringify(valid) })).status, 200);
  assert.equal((await fetch(`${baseUrl}/api/progress`, { method: 'PUT', headers: { 'content-type': 'application/json', origin: 'http://localhost' }, body: JSON.stringify({ ...valid, gender: 'male' }) })).status, 200);
  const response = await fetch(`${baseUrl}/api/progress/load`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'STUDENT@LUMS.EDU.PK' }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).gender, 'male');
  assert.equal(documents.size, 1);
});

test('allows saves from any frontend origin', async () => {
  const response = await fetch(`${baseUrl}/api/progress`, { method: 'OPTIONS', headers: { origin: 'https://any-preview.example', 'access-control-request-method': 'PUT' } });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
});

test('phone is the unique save and load identity', async () => {
  assert.equal((await fetch(`${baseUrl}/api/progress`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(phonePlayer) })).status, 200);
  const response = await fetch(`${baseUrl}/api/progress/load`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '+92 300 0856955' }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).username, 'Omer');
});
