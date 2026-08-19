import cors from 'cors';
import express from 'express';

const LANDMARK_ID = /^landmark_[A-Z]$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return typeof email === 'string' && email.length <= 254 && EMAIL.test(email) ? email.trim().toLowerCase() : null;
}

export function validateProgress(body) {
  if (!body || typeof body !== 'object') return null;
  const { email, gender, discovered, position, muted, biking, updatedAt } = body;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail
    || !['male', 'female'].includes(gender)
    || !Array.isArray(discovered) || discovered.length > 25 || !discovered.every((id) => LANDMARK_ID.test(id))
    || !Array.isArray(position) || position.length !== 2 || !position.every((value) => Number.isFinite(value) && value >= 0 && value <= 8192)
    || typeof muted !== 'boolean' || typeof biking !== 'boolean'
    || !Number.isFinite(Date.parse(updatedAt))) return null;
  return { _id: normalizedEmail, email: normalizedEmail, gender, discovered: [...new Set(discovered)], position, muted, biking, updatedAt: new Date(updatedAt) };
}

export function createApp(players, allowedOrigin = '') {
  const app = express();
  const allowedOrigins = new Set(allowedOrigin.split(',').filter(Boolean));
  app.disable('x-powered-by');
  app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
  app.use(express.json({ limit: '16kb' }));
  app.get('/health', (_request, response) => response.json({ ok: true }));
  app.post('/api/progress/load', async (request, response, next) => {
    try {
      const email = normalizeEmail(request.body?.email);
      if (!email) return response.status(400).json({ error: 'Invalid email' });
      const progress = await players.findOne({ _id: email });
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
