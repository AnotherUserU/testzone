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
    const sanitizedData = sanitizeData(data);

    const dbUrl = process.env.FIREBASE_DB_URL;
    if (!dbUrl) return res.status(500).json({ error: 'Database URL not configured' });
    
    const fbAuth = process.env.FIREBASE_AUTH;
    const cleanUrl = dbUrl.replace(/\/$/, '');
    const finalUrl = fbAuth ? `${cleanUrl}/guide.json?auth=${fbAuth}` : `${cleanUrl}/guide.json`;

    console.log('Firebase Save Attempt:', { 
      authEnabled: !!fbAuth,
      url: finalUrl.split('?')[0]
    });

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
