const admin = require('firebase-admin');

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
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = authHeader.split(' ')[1];
  
  if (token !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });

  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'Missing data' });

  await admin.database().ref('guide').set(data);
  res.status(200).json({ success: true });
}
