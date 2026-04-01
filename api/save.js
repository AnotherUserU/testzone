import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed token' });
  }

  const token = authHeader.replace('Bearer ', '');
  const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';

  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Valid Admin Token -> Save Data
    const { data } = req.body;
    
    // Consider adding server-side DOMPurify here if we expect HTML strings anywhere within JSON data
    // However, since we're using JSON State now, the risk is much lower because we render carefully.
    
    await admin.database().ref('guide').set(data);
    res.status(200).json({ success: true });
    
  } catch (err) {
    console.error('Save failed:', err);
    return res.status(401).json({ error: 'Invalid token or save failed' });
  }
}
