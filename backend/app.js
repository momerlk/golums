import cors from 'cors';
import express from 'express';

const LANDMARK_ID = /^landmark_[A-Z]$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return typeof email === 'string' && email.length <= 254 && EMAIL.test(email) ? email.trim().toLowerCase() : null;
}

export function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('92')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return /^3\d{9}$/.test(digits) ? `+92${digits}` : null;
}

export function validateProgress(body) {
  if (!body || typeof body !== 'object') return null;
  const { email, phone, username, gender, discovered, position, muted, biking, sessionCount = 0, playTimeSeconds = 0, updatedAt } = body;
  const normalizedPhone = normalizePhone(phone), normalizedEmail = normalizeEmail(email), id = normalizedPhone || normalizedEmail;
  const cleanUsername = typeof username === 'string' ? username.trim() : '';
  if (!id || (normalizedPhone && (cleanUsername.length < 2 || cleanUsername.length > 30))
    || !['male', 'female'].includes(gender)
    || !Array.isArray(discovered) || discovered.length > 25 || !discovered.every((id) => LANDMARK_ID.test(id))
    || !Array.isArray(position) || position.length !== 2 || !position.every((value) => Number.isFinite(value) && value >= 0 && value <= 8192)
    || typeof muted !== 'boolean' || typeof biking !== 'boolean'
    || !Number.isSafeInteger(sessionCount) || sessionCount < 0
    || !Number.isSafeInteger(playTimeSeconds) || playTimeSeconds < 0
    || !Number.isFinite(Date.parse(updatedAt))) return null;
  return { _id: id, ...(normalizedPhone ? { phone: normalizedPhone, username: cleanUsername } : { email: normalizedEmail }), gender, discovered: [...new Set(discovered)], position, muted, biking, sessionCount, playTimeSeconds, updatedAt: new Date(updatedAt) };
}

export function createApp(players) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '16kb' }));
  app.get('/health', (_request, response) => response.json({ ok: true }));
  app.post('/api/progress/load', async (request, response, next) => {
    try {
      const identity = normalizePhone(request.body?.phone) || normalizeEmail(request.body?.email);
      if (!identity) return response.status(400).json({ error: 'Invalid phone number' });
      const progress = await players.findOne({ _id: identity });
      return progress ? response.json(progress) : response.status(404).json({ error: 'Progress not found' });
    } catch (error) { return next(error); }
  });
  app.put('/api/progress', async (request, response, next) => {
    try {
      const progress = validateProgress(request.body);
      if (!progress) return response.status(400).json({ error: 'Invalid progress' });
      await players.replaceOne({ _id: progress._id }, progress, { upsert: true });
      return response.json({ ok: true, updatedAt: progress.updatedAt });
    } catch (error) { return next(error); }
  });
  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ error: 'Internal server error' });
  });
  return app;
}
