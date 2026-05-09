export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const dbUrl = process.env.FIREBASE_DB_URL;
    if (!dbUrl) return res.status(500).json({ error: 'Database URL not configured' });
    
    const fbAuth = process.env.FIREBASE_AUTH;
    const cleanUrl = dbUrl.replace(/\/$/, '');
    const finalUrl = fbAuth ? `${cleanUrl}/guide.json?auth=${fbAuth}` : `${cleanUrl}/guide.json`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    let response;
    try {
      response = await fetch(finalUrl, { signal: controller.signal });
      clearTimeout(timeout);
    } catch (err) {
      if (err.name === 'AbortError') return res.status(504).json({ error: 'Database timeout' });
      throw err;
    }

    if (!response.ok) throw new Error('Firebase REST error: ' + response.status);
    
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Load error:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
}
