export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = authHeader.split(' ')[1];
  
  const expectedToken = process.env.ADMIN_TOKEN || process.env.ADMIN_PASSWORD;
  if (token !== expectedToken) return res.status(401).json({ error: 'Unauthorized' });

  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'Missing data' });

  try {
    const dbUrl = process.env.FIREBASE_DB_URL;
    if (!dbUrl) return res.status(500).json({ error: 'Database URL not configured' });
    
    const response = await fetch(`${dbUrl}/guide.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Firebase REST error: ' + response.status);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
}
