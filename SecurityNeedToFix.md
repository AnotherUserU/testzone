# 🔴 Security Vulnerability Report — Team Composition Guide

> **Scanned by**: vulnerability-scanner skill (OWASP 2025 methodology)  
> **Date**: 2026-04-27  
> **Scope**: Full codebase (`admin.html`, `index.html`, `api/`, `shared/js/`, `shared/styles/`, config)  
> **Total Findings**: 14

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 **CRITICAL** | 2 | Server-side sanitization bypassed, Admin innerHTML without sanitization |
| 🟠 **HIGH** | 4 | JWT in localStorage, no rate limiting, debug info leak, missing CORS |
| 🟡 **MEDIUM** | 5 | CSP `unsafe-inline`, no input validation, no payload size limit, missing SRI, GSAP without SRI |
| 🔵 **LOW** | 3 | No logging/alerting, no CSRF token, no session timeout UI |

---

## 🔴 CRITICAL Findings

### CRIT-01: Server-Side Sanitization Bypassed

**OWASP**: A05 — Injection  
**File**: `api/save.js` → Line 21-22  
**Risk**: Stored XSS — attacker with admin access can inject malicious scripts that persist in Firebase and execute for ALL guest users.

```javascript
// SEMENTARA: Lewati sanitasi untuk tes koneksi
const sanitizedData = data;  // ← NO SANITIZATION!
```

**Impact**: Any HTML/JS stored via `/api/save` is served raw to all guests via `/api/load`. If an admin session is hijacked, the attacker can inject persistent XSS payloads that steal other users' data.

**Fix**:
```javascript
import createDOMPurify from 'isomorphic-dompurify';
const DOMPurify = createDOMPurify();

const sanitizedData = {};
for (const [key, value] of Object.entries(data)) {
  if (typeof value === 'string' && key.endsWith('HTML')) {
    sanitizedData[key] = DOMPurify.sanitize(value, {
      ALLOWED_TAGS: ['div','span','button','h1','img','br','b','i','em','strong','a'],
      ALLOWED_ATTR: ['class','id','style','contenteditable','data-*','src','alt','href','title','onclick','spellcheck']
    });
  } else {
    sanitizedData[key] = value;
  }
}
```

---

### CRIT-02: Admin HTML Loaded Without Sanitization

**OWASP**: A05 — Injection  
**File**: `admin.html` → Lines 1739, 1742, 1743  
**Risk**: Admin page loads Firebase HTML directly into DOM without DOMPurify sanitization.

```javascript
// admin.html — loadLocal / loadFromFirebase
if (data[m + 'HTML']) {
  const el = document.getElementById(PAGE_MAP[m]);
  if (el) el.innerHTML = data[m + 'HTML'];  // ← NO SANITIZATION!
}
```

**Impact**: If Firebase data is tampered with (database compromise, or another admin injected XSS), it executes immediately in the admin's browser with full admin privileges.

**Note**: `index.html` correctly uses `DOMPurify.sanitize()` (line 607). Admin should too.

**Fix**: Apply the same DOMPurify sanitization used in `index.html`:
```javascript
if (el) el.innerHTML = DOMPurify.sanitize(data[m + 'HTML'], config);
```

---

## 🟠 HIGH Findings

### HIGH-01: JWT Token Stored in localStorage (XSS-Accessible)

**OWASP**: A07 — Authentication Failures  
**File**: `admin.html` → Line 1920  
**Risk**: If any XSS exists (see CRIT-01/02), the JWT is immediately stealable.

```javascript
localStorage.setItem('adminToken', data.token);
```

**Impact**: `localStorage` is accessible to ALL JavaScript on the page. An XSS attack can read the admin JWT and use it to call `/api/save` to inject persistent malware.

**Fix**: Use `httpOnly` cookies instead:
```javascript
// api/login.js — set cookie
res.setHeader('Set-Cookie', `adminToken=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`);

// api/save.js — read from cookie
const token = req.cookies?.adminToken;
```

---

### HIGH-02: No Rate Limiting on API Endpoints

**OWASP**: A07 — Authentication Failures  
**Files**: `api/login.js`, `api/save.js`, `api/load.js`  
**Risk**: Brute-force attacks on `/api/login` and abuse of `/api/save`.

The 2-second delay on failed login (line 22 of login.js) helps but is insufficient:
- Attacker can run parallel requests
- No lockout after N failed attempts
- `/api/load` has no throttling (DDoS vector)
- `/api/save` has no throttling (data flooding)

**Fix**: Add rate limiting middleware or use Vercel Edge Config:
```javascript
// Use vercel.json or middleware
// Option: Use upstash/ratelimit for serverless
import { Ratelimit } from '@upstash/ratelimit';
const ratelimit = new Ratelimit({
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 per minute
});
```

---

### HIGH-03: Debug Information Leaked in Error Response

**OWASP**: A02 — Security Misconfiguration  
**File**: `api/save.js` → Line 47-48  
**Risk**: Error responses expose internal system details to attackers.

```javascript
res.status(500).json({ 
  error: 'Failed to save data', 
  details: error.message,           // ← Exposes internal error messages
  debug: { authPresent: !!process.env.FIREBASE_AUTH }  // ← Reveals env config
});
```

**Impact**: Attacker learns whether Firebase auth is configured, and gets detailed error messages that may reveal database URLs, JWT errors, or internal paths.

**Fix**:
```javascript
// Production: Never expose internal details
res.status(500).json({ error: 'Failed to save data' });
// Log details server-side only
console.error('Save error:', error);
```

---

### HIGH-04: No CORS Configuration

**OWASP**: A02 — Security Misconfiguration  
**Files**: All `api/*.js` files  
**Risk**: API endpoints accept requests from any origin.

None of the API endpoints set CORS headers. By default, Vercel allows requests from any origin to serverless functions.

**Impact**: An attacker can create a malicious webpage that calls `/api/load` to read all guide data, or attempt to call `/api/save` from a different domain.

**Fix**: Add CORS headers to API functions:
```javascript
// Add to each handler or create middleware
res.setHeader('Access-Control-Allow-Origin', 'https://your-domain.vercel.app');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

---

## 🟡 MEDIUM Findings

### MED-01: CSP Uses `unsafe-inline` for Scripts

**OWASP**: A02 — Security Misconfiguration  
**Files**: `index.html` L17-18, `admin.html` L13-14  
**Risk**: CSP allows inline scripts, weakening XSS protection.

```html
<meta http-equiv="Content-Security-Policy"
  content="... script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; ...">
```

`'unsafe-inline'` effectively disables CSP's XSS protection for scripts. This is required because the app uses inline `<script>` blocks, but it's a significant security weakness.

**Fix** (long-term): Move inline scripts to external `.js` files and use nonce-based CSP:
```html
<meta http-equiv="Content-Security-Policy"
  content="script-src 'self' 'nonce-{random}' https://cdnjs.cloudflare.com;">
```

---

### MED-02: No Input Validation on API Endpoints

**OWASP**: A05 — Injection  
**Files**: `api/login.js` L8, `api/save.js` L19  
**Risk**: No validation on request body structure or size.

```javascript
const { password } = req.body;  // login.js — no type check
const { data } = req.body;      // save.js — no schema validation
```

**Impact**: Attacker could send:
- Very long passwords (DoS via hashing)
- Non-string password values (type confusion)
- Malformed `data` object (crash server function)

**Fix**:
```javascript
// login.js
if (!password || typeof password !== 'string' || password.length > 200) {
  return res.status(400).json({ error: 'Invalid input' });
}

// save.js
if (!data || typeof data !== 'object') {
  return res.status(400).json({ error: 'Invalid data format' });
}
```

---

### MED-03: No Payload Size Limit on Save Endpoint

**OWASP**: A10 — Exceptional Conditions  
**File**: `api/save.js`  
**Risk**: Unlimited payload size allows resource exhaustion.

The save endpoint accepts arbitrarily large JSON payloads. Since the app stores entire HTML pages, a single save could be hundreds of KB. An attacker with a valid JWT could send enormous payloads to exhaust Firebase storage or crash the function.

**Fix**:
```javascript
const MAX_PAYLOAD = 512 * 1024; // 512KB
const bodySize = JSON.stringify(req.body).length;
if (bodySize > MAX_PAYLOAD) {
  return res.status(413).json({ error: 'Payload too large' });
}
```

---

### MED-04: GSAP Script Loaded Without SRI

**OWASP**: A03 — Software Supply Chain  
**File**: `index.html` → Line 22  
**Risk**: External script loaded without Subresource Integrity (SRI) hash.

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<!-- ↑ No integrity attribute! -->
```

**Note**: DOMPurify correctly uses SRI (line 19-21). GSAP does not.

**Impact**: If cdnjs is compromised, malicious code runs in every visitor's browser.

**Fix**:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
  integrity="sha512-..." crossorigin="anonymous" referrerpolicy="no-referrer"></script>
```

---

### MED-05: Firebase Config Endpoint Exposes Project Identifiers

**OWASP**: A02 — Security Misconfiguration  
**File**: `api/config.js`  
**Risk**: Public endpoint reveals Firebase project identifiers.

```javascript
res.status(200).json({
  authDomain: "this-is-the-real-one-4640e.firebaseapp.com",
  projectId: "this-is-the-real-one-4640e",
  // ...
});
```

While `apiKey` and `databaseURL` are hidden (good), the project ID and auth domain allow an attacker to enumerate Firebase services (Auth, Storage, Firestore) to find misconfigurations.

**Fix**: Only expose config if needed. Since all DB access goes through your API proxy, consider removing `/api/config` entirely.

---

## 🔵 LOW Findings

### LOW-01: No Logging or Alerting System

**OWASP**: A09 — Logging & Alerting  
**Files**: All `api/*.js` files  
**Risk**: No security event monitoring.

Failed logins, unauthorized save attempts, and unusual access patterns are not logged in any structured way. Only `console.error` is used, which is ephemeral on Vercel.

**Fix**: Implement structured logging:
```javascript
// Use Vercel's log drain or a service like LogDNA/Datadog
console.log(JSON.stringify({
  event: 'login_failed',
  ip: req.headers['x-forwarded-for'],
  timestamp: new Date().toISOString(),
  userAgent: req.headers['user-agent']
}));
```

---

### LOW-02: No CSRF Protection on State-Changing Endpoints

**OWASP**: A01 — Broken Access Control  
**Files**: `api/login.js`, `api/save.js`  
**Risk**: POST endpoints have no CSRF token validation.

While JWT in Authorization header partially mitigates CSRF (browsers don't auto-attach custom headers), the login endpoint uses `req.body` which could be forged via form submission from a malicious site.

**Fix**: Add `Origin` header validation:
```javascript
const origin = req.headers.origin;
if (origin && !origin.includes('your-domain.vercel.app')) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

---

### LOW-03: No Session Timeout Warning in UI

**OWASP**: A07 — Authentication Failures  
**File**: `admin.html`  
**Risk**: Admin users are not warned when their JWT is about to expire (24h).

If an admin is editing for several hours and their JWT expires, their next save will silently fail. There's no UI indicator showing remaining session time.

**Fix**: Decode JWT client-side and show a countdown or warning:
```javascript
function checkTokenExpiry() {
  const token = localStorage.getItem('adminToken');
  if (!token) return;
  const payload = JSON.parse(atob(token.split('.')[1]));
  const remaining = (payload.exp * 1000) - Date.now();
  if (remaining < 3600000) { // < 1 hour
    showToast('⚠️ Session expires in ' + Math.round(remaining/60000) + ' minutes', true);
  }
}
setInterval(checkTokenExpiry, 300000); // Check every 5 min
```

---

## Attack Surface Map

```
ENTRY POINTS:
├── /api/config    [GET]  → Public — exposes Firebase identifiers
├── /api/load      [GET]  → Public — returns all guide data (no auth)
├── /api/login     [POST] → Password → JWT (2s delay, no lockout)
├── /api/save      [POST] → JWT-protected (no sanitization, no size limit)
├── /index.html    [GET]  → Guest view (DOMPurify on load ✅)
└── /admin.html    [GET]  → Admin view (NO sanitization on load ❌)

TRUST BOUNDARIES:
├── Browser ↔ Vercel API  → JWT in Authorization header
├── Vercel API ↔ Firebase → Server-side auth token
└── Firebase → Browser     → Raw HTML (sanitized on guest, NOT on admin)

SENSITIVE ASSETS:
├── JWT Admin Token        → localStorage (XSS-accessible)
├── Firebase DB URL        → .env.local (server-only ✅)
├── Firebase Auth Token    → .env.local (server-only ✅)
├── Admin Password         → .env.local (server-only ✅)
└── Guide Content (HTML)   → Firebase RTDB (public read via API)
```

---

## Priority Action Plan

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| 1️⃣ | CRIT-01: Re-enable server sanitization | 🟢 Low | Eliminates stored XSS |
| 2️⃣ | CRIT-02: Add DOMPurify to admin load | 🟢 Low | Prevents admin XSS |
| 3️⃣ | HIGH-03: Remove debug info from errors | 🟢 Low | Stops info leakage |
| 4️⃣ | HIGH-01: Move JWT to httpOnly cookie | 🟡 Medium | Prevents token theft |
| 5️⃣ | MED-02: Add input validation | 🟢 Low | Prevents type confusion |
| 6️⃣ | MED-03: Add payload size limit | 🟢 Low | Prevents resource abuse |
| 7️⃣ | HIGH-02: Add rate limiting | 🟡 Medium | Prevents brute-force |
| 8️⃣ | HIGH-04: Configure CORS | 🟢 Low | Restricts cross-origin |
| 9️⃣ | MED-04: Add SRI to GSAP | 🟢 Low | Supply chain protection |
| 🔟 | MED-01: Externalize inline scripts | 🔴 High | Enables proper CSP |

---

> **Next Steps**: Fix items 1-3 first (all low-effort, high-impact). Then tackle items 4-6 in a second pass. Items 7-10 can be scheduled for a future sprint.
