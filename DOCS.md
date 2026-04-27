# 📘 Team Composition Guide — Technical Documentation

> **Project**: `team-composition-guide` v1.0.0  
> **Repository**: [AnotherUserU/imlosttho](https://github.com/AnotherUserU/imlosttho)  
> **Platform**: Vercel (Serverless)  
> **Database**: Firebase Realtime Database  
> **Last Updated**: 2026-04-27

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Project Structure](#3-project-structure)
4. [Data Model](#4-data-model)
5. [API Reference](#5-api-reference)
6. [Authentication & Security](#6-authentication--security)
7. [Frontend Architecture](#7-frontend-architecture)
8. [CSS Design System](#8-css-design-system)
9. [Key Functions Walkthrough](#9-key-functions-walkthrough)
10. [Deployment & Configuration](#10-deployment--configuration)
11. [Known Pitfalls & Gotchas](#11-known-pitfalls--gotchas)

---

## 1. Executive Summary

**Team Composition Guide** is a single-page web application that serves as a visual guide for game team compositions. It features a **dual-mode architecture**:

| Mode | File | Description |
|------|------|-------------|
| **Guest** | `index.html` | Read-only view. Loads data from Firebase, strips all admin UI elements for security. |
| **Admin** | `admin.html` | Full CMS with inline editing, drag-and-drop, color theming, and cloud save. |

The app supports **7 game modes** (Dungeon, Story, Raid, Story Towers, Battle Towers, Celestial Tower, World Boss), each with their own team compositions, credits, and modifiers.

### Key Technologies

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Firebase Realtime Database (REST API) |
| Auth | JWT (jsonwebtoken) |
| Sanitization | DOMPurify (client), isomorphic-dompurify (server) |
| Screenshot | html2canvas |

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                  Client (Browser)                     │
│  ┌─────────────┐              ┌─────────────────┐    │
│  │ index.html  │              │   admin.html    │    │
│  │ (Guest)     │              │   (Admin CMS)   │    │
│  └──────┬──────┘              └────────┬────────┘    │
└─────────┼──────────────────────────────┼─────────────┘
          │                              │
          ▼                              ▼
┌──────────────────────────────────────────────────────┐
│              Vercel Serverless Functions              │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌───────┐  │
│  │ /api/    │  │ /api/    │  │ /api/  │  │ /api/ │  │
│  │ config   │  │ login    │  │ load   │  │ save  │  │
│  └──────────┘  └──────────┘  └───┬────┘  └───┬───┘  │
└──────────────────────────────────┼────────────┼──────┘
                                   │            │
                                   ▼            ▼
                        ┌──────────────────────────┐
                        │   Firebase Realtime DB   │
                        │      /guide.json         │
                        └──────────────────────────┘
```

### Request Flow

**Page Load (Guest/Admin):**
```
Browser → GET /api/load → Vercel → GET Firebase /guide.json → JSON response → Render DOM
```

**Admin Login:**
```
Browser → POST /api/login {password} → Vercel verifies → Returns JWT → Stored in localStorage
```

**Admin Save:**
```
Browser → POST /api/save {data} + Bearer JWT → Vercel verifies JWT → PUT Firebase /guide.json
```

---

## 3. Project Structure

```
imlosttho-main/
├── admin.html              # Admin CMS (116KB, ~2070 lines) — monolithic
├── index.html              # Guest view (40KB, ~747 lines) — read-only
├── DOCS.md                 # This documentation file
├── package.json            # Node.js dependencies
├── vercel.json             # Vercel routing & security headers
│
├── api/                    # Vercel Serverless Functions
│   ├── config.js           # Public Firebase config (non-sensitive)
│   ├── login.js            # Admin authentication → JWT
│   ├── load.js             # Read data from Firebase
│   └── save.js             # Write data to Firebase (JWT-protected)
│
├── shared/                 # Shared assets between admin & guest
│   ├── data/
│   │   └── defaults.js     # Default team compositions (fallback data)
│   ├── js/
│   │   ├── state.js        # Application state (AppState singleton)
│   │   ├── firebase.js     # Firebase init, load, save, realtime listener
│   │   ├── renderer.js     # DOM renderer (buildCard, renderApp)
│   │   ├── download.js     # Screenshot engine (html2canvas wrapper)
│   │   ├── theme.js        # Dark/Light theme toggle
│   │   └── utils.js        # Utilities (sanitizeHTML, escapeAttr, showToast)
│   └── styles/
│       ├── variables.css   # Design tokens (colors, theme vars)
│       ├── base.css        # Reset, typography, buttons, toasts, banners
│       ├── navigation.css  # Nav bar, mode tabs, role badge
│       ├── cards.css       # Team card styles
│       ├── modals.css      # Overlay modals (download, credentials, etc.)
│       ├── main.css        # Legacy monolithic stylesheet (47KB)
│       └── responsive.css  # Breakpoint overrides
│
├── admin/                  # Admin-only assets
│   ├── js/
│   │   ├── drag.js         # Drag-and-drop logic
│   │   └── editor.js       # Inline editing utilities
│   └── styles/
│       └── admin-only.css  # Admin UI elements (edit buttons, handles)
│
└── .env.local              # Environment variables (secrets — NOT in git)
```

> **IMPORTANT**: `admin.html` and `index.html` are **monolithic** files. They contain all HTML structure, inline `<script>` blocks, and event handlers. The `shared/js/` modules exist as a **planned refactor** but are not fully integrated yet — the main files still use inline scripts.

---

## 4. Data Model

### Firebase Schema (`/guide.json`)

The entire application state is stored as a single JSON document:

```json
{
  "dungeonHTML": "<div class='mode-section'>...</div>",
  "storyHTML": "<div class='mode-section'>...</div>",
  "raidHTML": "...",
  "storyTowersHTML": "...",
  "battleTowersHTML": "...",
  "celestialTowerHTML": "...",
  "worldBossHTML": "...",
  "savedAt": "4/27/2026, 12:00:00 PM"
}
```

> **WARNING**: Data is stored as **raw HTML strings**, not structured JSON. This means the database contains the full rendered DOM for each mode section. This is a deliberate trade-off for simplicity (WYSIWYG editing) but requires careful sanitization.

### Team Card Structure (In-Memory)

```javascript
{
  id: 't1',                    // Unique identifier
  color: '#f5c842',            // Theme color (CSS custom property --tc)
  tag: 'TEAM 1 · COLUMN 1',   // Category label
  title: '130+ Floors Push',   // Display name
  desc: 'Best used from 130+', // Description text
  members: [
    { name: 'Unit Name', bind: 'Binding Vow' },
    // ... up to N members
  ]
}
```

### Constants & Maps

| Constant | Purpose |
|----------|---------|
| `ALL_MODES` | `['dungeon', 'story', 'raid', 'storyTowers', 'battleTowers', 'celestialTower', 'worldBoss']` |
| `PAGE_MAP` | Maps mode name → section element ID (e.g., `dungeon` → `dungeonSection`) |
| `GROUPS_MAP` | Maps mode name → groups container ID |
| `MP_MAP` | Maps mode name → modifier pill chain ID |
| `CRED_MAP` | Maps mode name → credits display ID |
| `PV_MAP` | Maps mode name → page visibility checkbox ID |

---

## 5. API Reference

### `GET /api/config`

Returns public Firebase configuration (non-sensitive identifiers only).

```json
{
  "authDomain": "this-is-the-real-one-4640e.firebaseapp.com",
  "projectId": "this-is-the-real-one-4640e",
  "storageBucket": "this-is-the-real-one-4640e.firebasestorage.app",
  "messagingSenderId": "660941883787"
}
```

> **NOTE**: `apiKey` and `databaseURL` are intentionally **not exposed**. All database access is proxied through `/api/load` and `/api/save`.

---

### `POST /api/login`

Authenticates admin users and returns a JWT.

| Field | Type | Required |
|-------|------|----------|
| `password` | string | Yes |

```
Request:  { "password": "your_admin_password" }
Response: { "success": true, "token": "eyJhbGciOiJIUzI1NiIs..." }
Error:    { "error": "Wrong password" }  (401, 2s delay)
```

**Security Features:**
- 2-second artificial delay on failed attempts (brute-force mitigation)
- JWT expires after 24 hours
- Secret key: `process.env.ADMIN_TOKEN || process.env.ADMIN_PASSWORD`

---

### `GET /api/load`

Fetches all guide data from Firebase. No authentication required.

```json
{
  "dungeonHTML": "...",
  "storyHTML": "...",
  "savedAt": "..."
}
```

---

### `POST /api/save`

Saves guide data to Firebase. **Requires valid JWT.**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <jwt_token>` |
| `Content-Type` | `application/json` |

```
Request:  { "data": { "dungeonHTML": "...", "storyHTML": "...", "savedAt": "..." } }
Response: { "success": true }
```

> **CAUTION**: The `save.js` endpoint currently has server-side sanitization **bypassed** (line 22: `const sanitizedData = data;`) due to Vercel environment limitations. However, **strict sanitization is enforced in `admin.html`** before sending data. Server-side HTML sanitization should be a future priority if moving to a more robust backend.

---

## 6. Authentication & Security

### Auth Flow

```
Page loads → Guest Mode (read-only)
  ↓
Navigate to /admin → Admin Shortcut Overlay opens
  ↓
Enter password → POST /api/login
  ↓
Password correct → JWT stored in localStorage + sessionStorage
  ↓
Admin Mode activated → Full editing capabilities
  ↓
Save → POST /api/save with Bearer JWT
  ↓
JWT expired → Must re-login
```

### Token Storage

| Storage | Key | Value |
|---------|-----|-------|
| `localStorage` | `adminToken` | JWT string |
| `sessionStorage` | `access_granted` | `"true"` |

### Security Headers (vercel.json)

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer data |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused APIs |
| `Access-Control-Allow-Origin` | `https://testzone-eight.vercel.app` | Restrict API access (CORS) |
| `SRI (Subresource Integrity)` | `sha512-...` | Verify GSAP & XLSX scripts |

### Guest Mode Security (`rewireAll()`)

When `index.html` loads, the `rewireAll()` function performs a **destructive security pass**:

```javascript
function rewireAll() {
  document.body.classList.remove('is-admin');
  // Disable all editable fields
  document.querySelectorAll('[contenteditable="true"]').forEach(el => {
    el.contentEditable = 'false';
  });
  // REMOVE admin-only elements entirely (not just hide)
  const HIDE_SEL = '.edit-btn,.delete-mem,.delete-team-btn,...';
  document.querySelectorAll(HIDE_SEL).forEach(el => el.remove());
}
```

> **TIP**: Elements are **removed from the DOM**, not hidden with CSS. This means even if a user inspects the page, admin controls don't exist in the DOM tree.

---

## 7. Frontend Architecture

### Dual-File Strategy

**admin.html** contains:
- Script Block 1 (~870 lines): `switchMode`, `buildCard`, `executeDownload`, `saveLocal`, `loadLocal`, drag/drop, color palettes
- Script Block 2 (~270 lines): `initApp`, `enterAsAdmin`, `enterAsGuest`, `loadFromFirebase`, `saveToFirebase`, login logic

**index.html** contains:
- Script Block 1 (~450 lines): `switchMode`, `buildCard`, `executeDownload` (read-only variants)
- Script Block 2 (~160 lines): `loadFromFirebase`, `enterAsGuest`, `rewireAll`

### Mode Navigation (`switchMode`)

```javascript
function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById(PAGE_MAP[mode]);
  if (sec) sec.classList.add('active');
  const btn = document.querySelector('.nav-btn[data-mode="' + mode + '"]');
  if (btn) btn.classList.add('active');
}
```

CSS: `.mode-section { display: none; }` / `.mode-section.active { display: block; }`

### Card DOM Structure

```
.team-card
├── .card-accent-bar        ← Colored top bar (team color)
├── .card-head
│   ├── .card-drag-handle   ← Admin only: ☰ drag handle
│   ├── .card-tag           ← "TEAM 1 · COLUMN 1"
│   ├── .card-title         ← "130+ Floors Push"
│   ├── .card-desc          ← Description text
│   ├── .delete-team-btn    ← Admin only: 🗑 delete
│   ├── .color-dot          ← Admin only: Color picker trigger
│   └── .clr-palette        ← Admin only: Color swatches
├── .card-body
│   ├── .card-members
│   │   ├── .mem-row × N    ← Each team member
│   │   │   ├── .mem-num    ← "1", "2", etc.
│   │   │   ├── .mem-name   ← Unit name
│   │   │   ├── .mem-bind   ← Binding vow
│   │   │   └── .delete-mem ← Admin only: ✕ delete
│   │   └── .add-point-btn  ← Admin only: + Add Member
│   └── .card-img-right     ← Unit screenshot images
├── .card-foot
│   ├── .foot-content
│   │   ├── .mod-box        ← 🔶 Modifier boxes
│   │   ├── .tips-box       ← 💡 Tips boxes
│   │   └── .warn-box       ← ⚠️ Warning boxes
│   ├── .card-footer-credits ← Per-card credit line (hidden by default)
│   └── admin buttons       ← Admin only: Add mod/tips/warn
└── .download-node-btn      ← Screenshot individual card
```

### Credit System

Credits operate at two levels:

1. **Section-level Credits** (`credDisplay`): Shown at the bottom of each mode section. Contains contributor pills with colored names.
2. **Per-card Credits** (`.card-footer-credits`): Dynamically injected by `injectCardCredits()`. Maps credit pill ranges to specific cards.

**Range Matching Logic:**
```javascript
// Credit pill: "TEAM 1-4" → contributor "GUDEX"
// For card "TEAM 3":
// 1. Extracts numbers from card tag/title → [3]
// 2. Checks each credit pill's label for range "1-4"
// 3. Since 3 >= 1 && 3 <= 4, it matches
// 4. Injects "UNIT BY GUDEX" into the card footer
```

> **NOTE**: Per-card credits are **only visible when downloading individual cards** (Node mode). In fullscreen download, they remain hidden — only section-level credits are shown.

---

## 8. CSS Design System

### Design Tokens (variables.css)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--bg` | `#0f0f17` | `#ffffff` | Page background |
| `--bg2` | `#13131f` | `#f5f5f5` | Card/panel background |
| `--bg3` | `#1a1a2e` | `#eeeeee` | Tertiary surfaces |
| `--text` | `#dde0f0` | `#1a1a1a` | Body text |
| `--dim` | `#6b6f8f` | `#888888` | Muted/secondary text |
| `--gold` | `#f5c842` | `#d4a500` | Primary accent (titles, highlights) |
| `--cyan` | `#00d4ff` | `#0099cc` | Interactive elements |
| `--green` | `#00e87a` | `#009900` | Success states |
| `--red` | `#ff3355` | `#cc0000` | Error/danger states |

### Typography

| Element | Font | Size |
|---------|------|------|
| Body | `Rajdhani` | 15px |
| Titles | `Orbitron` | 2.2rem |
| Section labels | `Orbitron` | 1rem |
| Code/mono | `Share Tech Mono` | varies |

### Z-Index Hierarchy

| Level | Z-Index | Element |
|-------|---------|---------|
| 1 | `100` | `.nav-header` |
| 2 | `500` | `.admin-link` |
| 3 | `999` | `#roleBadge`, `#fbStatus` |
| 4 | `9999` | Modals (`.modal-ov`, `.dl-ov`, etc.) |
| 5 | `99999` | `#adminShortcutOverlay` (login modal) |

### Stylesheet Architecture

```
variables.css    → Design tokens (loaded first)
base.css         → Reset, typography, buttons, toasts
navigation.css   → Nav bar, tabs, role badge
cards.css        → Team card components
modals.css       → Overlay modals
main.css         → Legacy monolithic (gradually migrating out)
responsive.css   → Breakpoint overrides
admin-only.css   → Admin UI elements (edit handles, drag indicators)
```

---

## 9. Key Functions Walkthrough

### `loadFromFirebase()` — Data Loading

```
1. Show "Loading..." status
2. GET /api/load
3. If response OK → parse JSON
4. For each mode in ALL_MODES:
   a. Find section element by PAGE_MAP[mode]
   b. Set innerHTML = data[mode + 'HTML']
5. Call injectCardCredits() to add per-card credits
6. Call rewireAll() (guest only) to strip admin UI
7. Show "✅ Loaded" status
```

> **WARNING**: On guest mode, `loadFromFirebase` runs the HTML through DOMPurify's `sanitize()` before injecting into the DOM. The allowed tags/attributes list must be carefully maintained to avoid breaking the UI while preventing XSS.

### `saveToFirebase()` — Data Saving (Admin Only)

```
1. Verify admin role
2. Collect HTML from each section:
   ALL_MODES.forEach(m => {
     data[m + 'HTML'] = document.getElementById(PAGE_MAP[m]).innerHTML;
   })
3. POST /api/save with Bearer JWT
4. Server verifies JWT → PUT to Firebase
5. Show success/error toast
```

### `executeDownload()` — Screenshot Engine

Two modes:

| Mode | Target | Credits Shown |
|------|--------|---------------|
| **Fullscreen** | `document.body` | Section-level only (per-card hidden) |
| **Node** | Individual `.team-card` | Per-card credits visible |

**Process:**
```
1. Hide admin UI elements (buttons, handles, etc.)
2. Set contenteditable to false
3. Wait 300-400ms for DOM to settle
4. html2canvas captures the target at 2x scale
5. Generate PNG or JPG based on format selection
6. Trigger download via <a> element
7. Restore hidden elements
```

### `enterAsAdmin()` / `enterAsGuest()`

```javascript
// Admin Mode
function enterAsAdmin() {
  document.body.classList.add('is-admin');
  document.body.classList.remove('readonly');
  document.getElementById('appContent').style.display = 'block';
  // Enable all contenteditable fields
  // Show edit buttons, drag handles, etc.
}

// Guest Mode
function enterAsGuest() {
  document.getElementById('appContent').style.display = 'block';
  loadFromFirebase(); // Then rewireAll() strips admin elements
}
```

---

## 10. Deployment & Configuration

### Environment Variables (`.env.local`)

| Variable | Description | Required |
|----------|-------------|----------|
| `ADMIN_PASSWORD` | Admin login password | Yes |
| `ADMIN_TOKEN` | JWT signing secret (falls back to ADMIN_PASSWORD) | No |
| `FIREBASE_DB_URL` | Firebase Realtime Database URL | Yes |
| `FIREBASE_AUTH` | Firebase database secret/auth token | Yes |

### Vercel Configuration

```json
{
  "cleanUrls": true,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

**URL Routing:**
- `/` → `index.html` (Guest)
- `/admin` → `admin.html` (Admin CMS)
- `/api/*` → Serverless functions

### Local Development

```bash
npm install
npm run dev    # Runs: vercel dev --listen 3000
```

This starts a local Vercel dev server at `http://localhost:3000` with full serverless function support.

---

## 11. Known Pitfalls & Gotchas

### ⚠️ Monolithic Script Blocks

Both `admin.html` and `index.html` contain large inline `<script>` blocks. A **single syntax error** anywhere in a block will cause the **entire block to fail silently**, breaking all functions defined within it.

**Mitigation:** Use the syntax checker:
```bash
node scratch/check_syntax.js
```

### ⚠️ Duplicate Constant Declarations

If a `const` is declared twice in the same script block (e.g., `const ALL_MODES`), the entire block crashes with `SyntaxError`. This has happened during refactoring.

### ⚠️ `window.onload` vs `DOMContentLoaded`

`window.onload` fires **after** `DOMContentLoaded`. If both are used, `window.onload` can overwrite state set by `DOMContentLoaded`. A problematic `window.onload = () => enterAsGuest()` in `admin.html` was removed for this reason — it was resetting admin mode back to guest.

### ⚠️ Server-Side Sanitization Bypassed

In `api/save.js`, sanitization is currently bypassed because the `isomorphic-dompurify` library caused `FUNCTION_INVOCATION_FAILED` (500) errors in Vercel. 
**Mitigation**: 
1.  **Client-Side Sanitization**: `admin.html` runs `DOMPurify.sanitize()` on all HTML data before sending the POST request.
2.  **Payload Limit**: `api/save.js` enforces a 2MB limit.
3.  **CORS**: Restricted to the production domain.

### ⚠️ CSS Z-Index Collisions

The `#adminShortcutOverlay` has `z-index: 99999`. If not properly hidden with `display: none`, it acts as an invisible wall blocking all clicks on the page beneath it.

### ⚠️ HTML as Database

The app stores rendered HTML in Firebase, not structured data. This means:
- No easy data migration
- XSS risk if sanitization fails
- Large payload sizes
- Difficult to query or filter content

---

> **For new developers / AI agents**: Start by reading `shared/js/state.js` for the data model, then `shared/js/renderer.js` for how data becomes UI. The inline scripts in `admin.html` are where most of the actual logic lives today.
