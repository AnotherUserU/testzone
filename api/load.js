export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const dbUrl = process.env.FIREBASE_DB_URL;
    if (!dbUrl) return res.status(500).json({ error: 'Database URL not configured' });
    
    const response = await fetch(`${dbUrl}/guide.json`);
    if (!response.ok) throw new Error('Firebase REST error: ' + response.status);
    
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Load error:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
}
