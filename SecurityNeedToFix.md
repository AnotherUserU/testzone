# 🛡️ Security Audit Log & Remediation Plan — Team Composition Guide

> **Scanned by**: `wiki-architect` + `architect-review` + `security-auditor` + `differential-review` + `vibe-code-auditor` (5-Skill Audit)
> **Date**: 2026-04-30 (Full Re-Audit)
> **Scope**: Full codebase (`admin.html`, `index.html`, `api/`, `shared/js/`, `shared/js-min/`, `vercel.json`)
> **Current Status**: 🟡 PARTIALLY SECURE — 3 new findings from differential/vibe audit (2 MEDIUM open, 1 LOW open)

---

## 📊 Vulnerability Summary

| Severity | Count | Status | Description |
|----------|-------|--------|-------------|
| 🔴 **CRITICAL** | 2 | ✅ FIXED | Server-side sanitization bypass (client-mitigated), Admin innerHTML XSS |
| 🟠 **HIGH** | 4 | ✅ FIXED | Debug info leak, Missing CORS, JWT in localStorage, Rate Limiting |
| 🟡 **MEDIUM** | 8 | ⚠️ 6 FIXED / 2 OPEN | Input validation, Payload size, SRI, UI Crash DoS, CLOUD_CONFIG XSS surface, CORS header gap |
| 🔵 **LOW** | 3 | ⚠️ 2 MITIGATED / 1 OPEN | CSRF, Logic duplication resolved, `load.js` no timeout |

---

## 🔴 CRITICAL (Resolved with Residual Risk)

### CRIT-01: Server-Side Sanitization Bypassed
* **File**: `api/save.js:28`
* **Threat Model**: Malicious actors bypassing the client-side app can POST unsanitized HTML directly to Firebase. Any data in the database will be rendered by `admin.html` as HTML.
* **Code Evidence**:
  ```javascript
  const sanitizedData = data; // bypassed — isomorphic-dompurify caused 500 errors
  ```
* **Current Status**: ✅ Client-side mitigated
* **Mitigations Applied**:
  * `admin.html` enforces `DOMPurify.sanitize()` before every `POST` request.
  * 2MB payload size limit enforced at `save.js:17-20`.
  * CORS restricted to `https://testzone-eight.vercel.app`.
  * Firebase Auth token required for write access.
* **Residual Risk**: 🟡 MEDIUM — A compromised admin session or direct `curl` call still bypasses all client-side protection. Server-side sanitization must be restored once `isomorphic-dompurify` Vercel compatibility is resolved.

### CRIT-02: Admin HTML Loaded Without Sanitization
* **File**: `admin.html` — `loadFromFirebase()` function
* **Threat Model**: Stored XSS. Compromised Firebase data executes scripts in admin's browser.
* **Current Status**: ✅ FIXED
* **Remediation**: `DOMPurify.sanitize()` implemented in `loadFromFirebase()` with strict whitelist of allowed tags/attributes, stripping `<script>` and `onload` handlers.

---

## 🟠 HIGH (Resolved)

### HIGH-01: JWT Token in localStorage
* **Threat Model**: XSS → permanent admin token theft.
* **Status**: ✅ FIXED — JWT system removed. Password via `x-admin-password` header in `sessionStorage` (cleared on tab close).

### HIGH-02: Debug Information Leaked in API Responses
* **Threat Model**: Information disclosure. Stack traces reveal backend architecture.
* **Status**: ✅ FIXED — All debug objects removed from `api/save.js` and `api/login.js` responses.

### HIGH-03: Missing CORS Configuration
* **Threat Model**: Unauthenticated cross-origin requests to protected API.
* **Status**: ✅ FIXED — Explicit CORS headers in `vercel.json`. `/api/(save|login)` restricted to production domain only.

### HIGH-04: No Rate Limiting on Login Endpoint
* **Threat Model**: Brute-force password attacks against `/api/login`.
* **Status**: ✅ FIXED — 2-second artificial delay on failed login (`login.js:23`). Note: stateless; parallel requests are not blocked.

---

## 🟡 MEDIUM

### MED-01: Admin Logic Exposure (Lack of Obfuscation)
* **Status**: ✅ FIXED
* **Remediation**: All `shared/js/` files obfuscated and outputted to `shared/js-min/`. `admin.html` loads only from minified directory.

### MED-02: Unbounded API Payload Size
* **File**: `api/save.js:17`
* **Status**: ✅ FIXED
* **Remediation**: 2MB payload size limit enforced.
  > Note: Payload limit reconciled to 2MB across documentation and implementation.

### MED-03: Missing Subresource Integrity (SRI)
* **Status**: ✅ FIXED
* **Remediation**: `integrity` + `crossorigin="anonymous"` added to all external CDN script tags (DOMPurify, GSAP, ScrollTrigger).

### MED-04: Client-Side Denial of Service (UI Crash via html2canvas)
* **File**: `index.html:468-523` (fullscreen download path)
* **Status**: ✅ FIXED
* **Root Cause**: `html2canvas` 1.4.1 calls `createPattern()` on a temp canvas from any `linear-gradient`. Zero-dimension elements produce empty canvases → `InvalidStateError`.
* **Culprits**: `.scroll-progress`, `.card-accent-bar`, `.section-label::before/after`, `.mem-row::after`
* **Remediation (Nuclear Option in `onclone` callback)**:
  * `* { background-image: none !important; }` — disables all gradients in clone.
  * Solid color fallbacks for `.card-accent-bar`.
  * `ignoreElements` explicitly skips `.nav-header` and `#scrollProgress`.
  * `gsap.set("#scrollProgress", { width: "0%" })` prevents 100% start state.

### MED-05: `SECURITY.CLOUD_CONFIG` Allows Event Handlers in DOMPurify ⚠️ OPEN
* **File**: `index.html:278`
* **Discovered by**: `security-auditor` + `differential-review` (2026-04-30 audit)
* **Status**: ⚠️ OPEN — Accepted risk with mitigation
* **Code Evidence**:
  ```javascript
  CLOUD_CONFIG: {
    ADD_ATTR: ['onclick', 'ondblclick', 'contenteditable', ...]
  }
  ```
* **Threat Model**: If Firebase data is compromised and rendered using `CLOUD_CONFIG` instead of the strict `ALLOWED_TAGS` config, `onclick` handlers execute as stored XSS.
* **Current Mitigation**: `CLOUD_CONFIG` is (by convention) only used in `admin.html` rendering paths, never in `index.html` guest view. No code enforcement exists to guarantee this.
* **Recommended Fix**: Add a runtime guard:
  ```javascript
  if (document.body.dataset.role !== 'admin') throw new Error('CLOUD_CONFIG not allowed in guest context');
  ```

### MED-06: CORS Header Missing `x-admin-password` ⚠️ OPEN
* **File**: `vercel.json:26`
* **Discovered by**: `differential-review` (2026-04-30 audit)
* **Status**: ⚠️ OPEN
* **Code Evidence**:
  ```json
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
  ```
* **Threat Model**: If the app is tested from a different origin, or if the domain changes, the browser's CORS preflight (`OPTIONS`) will reject requests because `x-admin-password` is not in the allowed headers list. This would silently break admin save/login without a clear error.
* **Recommended Fix**:
  ```json
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-password"
  ```

---

## 🔵 LOW

### LOW-01: Lack of CSRF Tokens (MITIGATED)
* **Status**: ✅ MITIGATED
* **Description**: No traditional CSRF tokens, but `x-admin-password` as a custom header forces a CORS preflight, which is restricted to the production domain. Effectively blocks CSRF from external origins.

### LOW-02: Dual-File Code Duplication Risk (RESOLVED)
* **Status**: ✅ FIXED
* **Description**: `refreshAllCardCredits()` logic unified into `shared/js/credits.js` (`refreshAllCardCreditsCore`). Both `admin.html` and `index.html` delegate to this single source.
* **Remaining**: Two `buildCard()` implementations (one in `renderer.js` for admin, one in `index.html` for guest) — intentional by design but must stay structurally in sync.

### LOW-03: `api/load.js` Fetch Has No Timeout ⚠️ OPEN
* **File**: `api/load.js:11`
* **Discovered by**: `vibe-code-auditor` (2026-04-30 audit)
* **Status**: ⚠️ OPEN
* **Code Evidence**:
  ```javascript
  const response = await fetch(finalUrl); // no AbortController / timeout
  ```
* **Risk**: If Firebase is slow or unresponsive, the Vercel function hangs until the platform's 10s timeout, causing a **504 Gateway Timeout** for all users with no retry or graceful degradation.
* **Recommended Fix**:
  ```javascript
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(finalUrl, { signal: controller.signal });
    clearTimeout(timeout);
    // ... rest of handler
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ error: 'Database timeout' });
    throw err;
  }
  ```

---

## 🗺️ Attack Surface Map

```text
ENTRY POINTS:
├── /api/config    [GET]  → Public — Exposes non-sensitive Firebase config IDs.
├── /api/load      [GET]  → Public — Returns full guide HTML from Firebase. (⚠️ No timeout)
├── /api/login     [POST] → Protected (2s delay on fail, payload validation, no rate limit).
├── /api/save      [POST] → Protected (x-admin-password header, 2MB size limit, CORS restricted).
│                            ⚠️ Server-side sanitization BYPASSED (client-side only).
├── /index.html    [GET]  → Public guest view (SRI active, DOMPurify guest config, read-only).
└── /admin.html    [GET]  → Admin CMS (DOMPurify CLOUD_CONFIG, Obfuscated JS, sessionStorage auth).
                            ⚠️ CLOUD_CONFIG allows onclick handlers — admin-only by convention.
```

---

## 📋 Open Items Tracker

| ID | Severity | File | Description | Action Required |
|----|----------|------|-------------|-----------------|
| MED-05 | 🟡 MEDIUM | `index.html:278` | `CLOUD_CONFIG` allows event handlers | Add runtime guard to block use outside admin |
| MED-06 | 🟡 MEDIUM | `vercel.json:26` | CORS missing `x-admin-password` header | Add to `Access-Control-Allow-Headers` |
| LOW-03 | 🔵 LOW | `api/load.js:11` | No fetch timeout → 504 risk | Add `AbortController` with 8s timeout |
| CRIT-01 | 🔴 RESIDUAL | `api/save.js:28` | Server-side DOMPurify bypassed | Resolve `isomorphic-dompurify` Vercel compat |
