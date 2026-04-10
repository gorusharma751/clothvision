import app, { initializeApp } from '../backend/server.js';

let bootPromise;

export default async function handler(req, res) {
  try {
    if (!bootPromise) bootPromise = initializeApp();
    await bootPromise;
    return app(req, res);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server initialization failed' });
  }
}
