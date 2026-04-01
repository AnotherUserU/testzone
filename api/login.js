import jwt from 'jsonwebtoken';

const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 min lock

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate Limiting
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const record = attempts.get(ip) || { count: 0, firstAttempt: Date.now() };
  
  if (Date.now() - record.firstAttempt > WINDOW_MS) {
    record.count = 0; 
    record.firstAttempt = Date.now();
  }
  if (record.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }
  
  record.count++;
  attempts.set(ip, record);

  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    // Generate JWT token
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'fallback-secret-for-dev', { expiresIn: '8h' });
    record.count = 0; // reset on success
    res.status(200).json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
}
