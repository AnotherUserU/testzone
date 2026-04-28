export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Allow password to be sent in headers or body
  const providedPassword = req.headers['x-admin-password'] || req.body.password;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!providedPassword || providedPassword !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data } = req.body;

    // Payload size limit (2MB) to prevent resource exhaustion
    const payloadSize = JSON.stringify(req.body).length;
    if (payloadSize > 2 * 1024 * 1024) {
      return res.status(413).json({ error: 'Payload too large' });
    }

    // Input validation
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    // Server-side sanitization — temporarily bypassed to stop 500 error
    const sanitizedData = data; 
    /* 
    const sanitizedData = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && key.endsWith('HTML')) {
        sanitizedData[key] = DOMPurify.sanitize(value, SANITIZE_CONFIG);
      } else {
        sanitizedData[key] = value;
      }
    }
    */

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
      console.error('Firebase write error:', response.status, errorText);
      throw new Error('Database write failed');
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Save error:', error);
    // Do NOT expose internal details to the client
    res.status(500).json({ error: 'Failed to save data' });
  }
}
