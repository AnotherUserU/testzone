import jwt from 'jsonwebtoken';
import DOMPurify from 'isomorphic-dompurify';

// Recursive sanitizer for objects containing HTML strings
const sanitizeData = (data) => {
  if (typeof data === 'string') {
    return DOMPurify.sanitize(data, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'span', 'div', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'svg', 'path', 'circle', 'rect', 'button', 'input', 'select', 'option', 'textarea', 'label'],
      ALLOWED_ATTR: ['href', 'title', 'target', 'class', 'style', 'id', 'src', 'alt', 'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'cx', 'cy', 'r', 'x', 'y', 'type', 'value', 'placeholder', 'readonly', 'disabled', 'checked', 'data-mode', 'aria-label', 'contenteditable']
    });
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const key in data) {
      sanitized[key] = sanitizeData(data[key]);
    }
    return sanitized;
  }
  return data;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  // 1. Verify Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.ADMIN_TOKEN || process.env.ADMIN_PASSWORD;

  try {
    jwt.verify(token, jwtSecret);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // 2. Validate and Sanitize Input
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'Missing data' });

  const sanitizedData = sanitizeData(data);

  // 3. Save to Firebase
  try {
    const dbUrl = process.env.FIREBASE_DB_URL;
    if (!dbUrl) return res.status(500).json({ error: 'Database URL not configured' });
    
    const fbAuth = process.env.FIREBASE_AUTH;
    const cleanUrl = dbUrl.replace(/\/$/, '');
    const finalUrl = fbAuth ? `${cleanUrl}/guide.json?auth=${fbAuth}` : `${cleanUrl}/guide.json`;

    console.log('Firebase Save Attempt:', { 
      authEnabled: !!fbAuth,
      url: finalUrl.split('?')[0] // Log URL tanpa token untuk keamanan
    });

    const response = await fetch(finalUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedData)
    });
    
    if (!response.ok) throw new Error('Firebase REST error: ' + response.status);
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

