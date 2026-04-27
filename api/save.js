import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const adminPassword = process.env.ADMIN_PASSWORD;
  const jwtSecret = process.env.ADMIN_TOKEN || adminPassword;

  try {
    jwt.verify(token, jwtSecret);
    const { data } = req.body;
    
    // SEMENTARA: Lewati sanitasi untuk tes koneksi
    const sanitizedData = data; 

    const dbUrl = process.env.FIREBASE_DB_URL;
    if (!dbUrl) return res.status(500).json({ error: 'Database URL not configured' });
    
    const fbAuth = process.env.FIREBASE_AUTH;
    const cleanUrl = dbUrl.replace(/\/$/, '');
    const finalUrl = fbAuth ? `${cleanUrl}/guide.json?auth=${fbAuth}` : `${cleanUrl}/guide.json`;

    const response = await fetch(finalUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firebase error (${response.status}): ${errorText}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ 
      error: 'Failed to save data', 
      details: error.message,
      debug: { authPresent: !!process.env.FIREBASE_AUTH }
    });
  }
}
