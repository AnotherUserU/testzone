import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const jwtSecret = process.env.ADMIN_TOKEN || adminPassword;

  if (!adminPassword) {
    return res.status(500).json({ error: 'Admin password not configured' });
  }

  if (password === adminPassword) {
    // Generate a JWT valid for 24 hours
    const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '24h' });
    res.status(200).json({ success: true, token });
  } else {
    // Artificial delay to prevent brute-force attacks
    await new Promise(resolve => setTimeout(resolve, 2000));
    res.status(401).json({ error: 'Wrong password' });
  }
}

