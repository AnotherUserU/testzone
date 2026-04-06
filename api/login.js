export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.status(200).json({ success: true, token: process.env.ADMIN_TOKEN || process.env.ADMIN_PASSWORD });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
}
