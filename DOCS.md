# 📘 Team Composition Guide — Technical Documentation

> **Project Directive**: "Tambahkan semua kode kalau bisa di refactor (tanpa merusak fitur kedua me robust semua kode)"
> **Architectural Goal**: Centralize logic, eliminate redundancy, and enforce data-driven rendering across Guest and Admin modes.

> **Project**: `team-composition-guide` v1.2.0  
> **Repository**: [AnotherUserU/testzone](https://github.com/AnotherUserU/testzone)  
> **Platform**: Vercel (Serverless)  
> **Database**: Firebase Realtime Database  
> **Last Updated**: 2026-05-10 (Session: Centralized UI Components library, unified ScreenshotEngine, refactored Admin logic for robustness, improved Credit matching helper structure)


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
| Auth | Password via `x-admin-password` header (sessionStorage) |
| Sanitization | DOMPurify 3.0.6 (client-side only — server bypass documented in Pitfalls §11) |
| Screenshot | html2canvas 1.4.1 (lazy-loaded, targeted `onclone` DOM removal strategy) |
| Animations | GSAP 3.12.5 + ScrollTrigger (SRI-protected CDN) |

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
├── admin.html              # Admin CMS — uses ES module imports
├── index.html              # Guest view (~800 lines) — read-only, inline scripts
├── DOCS.md                 # This documentation file
├── SecurityNeedToFix.md    # Security vulnerability tracker
├── package.json            # Node.js dependencies
├── vercel.json             # Vercel routing & security headers
│
├── api/                    # Vercel Serverless Functions
│   ├── config.js           # Public Firebase config (non-sensitive)
│   ├── login.js            # Admin authentication → password check
│   ├── load.js             # Read data from Firebase
│   └── save.js             # Write data to Firebase (password-protected)
│
├── shared/                 # Shared assets
│   ├── js/
│   │   ├── admin.js        # Master admin logic (ES module, imported by admin.html)
│   │   ├── config.js       # Constants: ALL_MODES, PAGE_MAP, CRED_MAP, etc.
│   │   ├── state.js        # Application state (AppState singleton)
│   │   ├── firebase.js     # Firebase load/save (imports refreshAllCardCredits)
│   │   ├── renderer.js     # ⚠️ Credit matching + buildCard (ADMIN version)
│   │   ├── drag.js         # Drag-and-drop logic
│   │   └── utils.js        # Utilities (sanitizeHTML, escapeAttr, showToast)
│   └── styles/
│       ├── variables.css   # Design tokens (colors, theme vars)
│       ├── base.css        # Reset, typography, buttons, toasts, banners
│       ├── navigation.css  # Nav bar, mode tabs, role badge
│       ├── cards.css       # Team card styles
│       ├── components.css  # UI components
│       ├── modals.css      # Overlay modals
│       ├── admin.css       # Admin-specific UI styles
│       └── main.css        # Master import file
│
├── scratch/                # Development utilities
│   └── check_syntax.js     # JS syntax validator
│
├── tests/                  # Jest test suite
│   ├── login.test.js
│   ├── save.test.js
│   └── renderer.test.js
│
└── .env.local              # Environment variables (secrets — NOT in git)
```

> **⚠️ CRITICAL**: `refreshAllCardCredits()` exists in **TWO places**: `shared/js/renderer.js` (for admin.html) and inline in `index.html` (for the public page). **Both MUST be kept in sync** when modifying credit matching logic. See [Pitfall: Dual Credit Functions](#️-dual-credit-functions-indexhtml-vs-rendererjs).

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
Enter password → Stored directly in sessionStorage (No JWT generated)
  ↓
Admin Mode activated → Full editing capabilities enabled
  ↓
Save → POST /api/save with header `x-admin-password`
  ↓
Invalid password → Backend rejects save request
```

### Token Storage

| Storage | Key | Value |
|---------|-----|-------|
| `sessionStorage` | `adminKey` | Raw admin password (cleared when browser closes) |

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
  const HIDE_SEL = '.edit-btn,.delete-mem,.delete-team-btn,.delete-box,.add-point-btn,.card-drag-handle,.color-dot,.clr-palette,.block-handle,.cred-edit-btn,.float-xl,.add-banner-btn,.add-banner-bar,.save-bar,.del-section-btn,.team-section-actions,.add-section-btn';
  document.querySelectorAll(HIDE_SEL).forEach(el => el.remove());
}
```

> **TIP**: Elements are **removed from the DOM**, not hidden with CSS. This means even if a user inspects the page, admin controls don't exist in the DOM tree.

### 6.1 Responsive Design (Mobile-First)

The UI is optimized for screens down to **360px** width:

- **Breakpoints**: 1000px (tablet), 768px (small tablet), 640px (phone).
- **Layout**: Grid collapses from 4 columns to 2 columns (768px) and finally 1 column (640px).
- **Navigation**: Search bar and theme toggle group into a compact row on mobile using `display: flex` while maintaining original desktop layout via `display: contents`.
- **Touch Optimization**: Interactive elements have a minimum hit area of **44px** on mobile.
- **Card Layout**: Character images remain side-by-side but shrink to `130px` on mobile to preserve visual hierarchy.

### 6.2 Code Obfuscation (Admin Logic)

To prevent unauthorized users from reverse-engineering the admin dashboard, the core logic is obfuscated using `javascript-obfuscator`.

- **Master Files**: `shared/js/` (Readable source code, used for development).
- **Production Files**: `shared/js-min/` (Encrypted/Acak versions, loaded by `admin.html`).
- **Features Enabled**:
    - **Self-Defending**: Code breaks if tampered with or prettified.
    - **Dead Code Injection**: Adds decoy logic to confuse analyzers.
    - **String Array Rotation/Encoding**: Encrypts sensitive strings (API endpoints, identifiers).
    - **Debug Protection**: Attempts to block browser DevTools if it detects inspection of the script.

**How to update obfuscated code:**
```bash
# After editing any file in shared/js/
javascript-obfuscator shared/js --output shared/js-min [options]
```

### 6.3 Modifier Customization System

The Team Composition Guide features a color-coded modifier system to highlight important team attributes (e.g., Elemental Weakness, Recommended Stats).

- **Colors**: Supports 8 professional themes: Purple, Green, White, Blue (Cyan), Red, Yellow (Gold), Orange, and Gray.
- **Implementation**: Uses standard CSS classes (`.mp-pill.red`, `.mp-pill.green`, etc.) applied via the admin `modModal`.
- **Admin Workflow**:
    1. Select a card and click **MANAGE MODIFIERS**.
    2. Choose a color from the circular palette.
    3. Type the modifier label and click **ADD**.
    4. The tag will appear in the team card with the chosen theme.
- **Persistence**: Color data is stored in the DOM structure (as class names) and persisted to Firebase within the `guide.json` blob.

### 6.4 Deployment Rules

To maintain security while allowing rapid development, follow these rules:

1. **Production (`imlosttho`)**:
   - **MUST** use obfuscated scripts from `shared/js-min/`.
   - Ensure `admin.html` points to `shared/js-min/admin.js?v=...`.
   - Push only after explicit verification and approval.
2. **Development/Testing (`testzone`)**:
   - Can use readable scripts from `shared/js/` for easier debugging.
   - `admin.html` can point to `shared/js/admin.js` for development.
   - Used for staging features before production.
# Update the ?v= version query parameter in admin.html's script tags
```

---

## 7. Frontend Architecture

### Dual-File Strategy

**admin.html** uses **ES modules**:
- Imports from `shared/js/admin.js` → which imports `config.js`, `state.js`, `utils.js`, `renderer.js`, `drag.js`, `firebase.js`
- `renderer.js` exports `refreshAllCardCredits()` with **strict location-based credit matching**
- `firebase.js` exports `loadFromFirebase()` / `saveToFirebase()` and calls `refreshAllCardCredits()` after data load

**index.html** uses **inline `<script>` blocks** (NO ES modules):
- Script Block 1 (~500 lines): `switchMode`, `buildCard`, `executeDownload`, `refreshAllCardCredits` (DUPLICATE of renderer.js logic)
- Script Block 2 (~100 lines): `loadFromFirebase`, `enterAsGuest`, `rewireAll`, scroll animations

> **⚠️ WARNING**: Because `index.html` cannot import ES modules, it has its OWN copy of `refreshAllCardCredits()`. Any changes to credit matching logic in `renderer.js` **MUST** also be manually applied to `index.html`.

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
│   │   ├── .mod-box        ← 🔶 Modifier boxes (Contains .add-point-btn for Admin)
│   │   ├── .tips-box       ← 💡 Tips boxes (Contains .add-point-btn for Admin)
│   │   └── .warn-box       ← ⚠️ Warning boxes
│   ├── .card-footer-credits ← Per-card credit line (hidden by default)
│   └── admin buttons       ← Admin only: Add mod/tips/warn
  └── .download-node-btn      ← Screenshot individual card
```

## 8. Screenshot System

The application uses `html2canvas` (v1.4.1) for generating high-fidelity PNG/JPG exports of the guide.

### Capture Strategy

- **Full-Screen Capture**: Targets `#pageBody`. This excludes the sticky `nav-header` and `fbStatus` overlay.
- **Per-Card Capture**: Targets a specific `.team-card`. The user can trigger this via the "Screenshot" button on any card or via the Download Modal's dropdown.

### Layout Constraints (1440px Standard)

To ensure consistent 4-column layouts without horizontal clipping or black gaps:
1.  **CSS Standard**: `.grid-wrap` and `.alert-wrap` have a `max-width: 1440px`.
2.  **Forced Reflow**: During `executeDownload` (fullscreen), the script temporarily forces `#pageBody { max-width: 1440px; margin: 0 auto; }`. This ensures `html2canvas` calculates the 4-column layout regardless of the actual browser window size.

### Sanitization (`HIDE_SEL`)

The `HIDE_SEL` constant contains CSS selectors for all UI elements that must be stripped from the screenshot. This includes:
- Admin buttons (`.edit-btn`, `.add-point-btn`, etc.)
- Drag handles (`.card-drag-handle`, `.block-handle`)
- Toolbars (`.add-banner-bar`, `.save-bar`)
- Navigation elements (`.nav-header`, `#downloadBtn`, `#dlBtnWrapper`)

### Stability & Crash Prevention (`onclone`)

The `onclone` callback is used to modify the document clone before rendering:
1.  **UI Removal**: `clonedDoc.querySelectorAll(HIDE_SEL).forEach(el => el.remove())`. Using `.remove()` is more reliable than `display: none`.
2.  **Gradient Guard**: `html2canvas` 1.4.1 throws an `InvalidStateError` if it attempts to render a `linear-gradient` on an element with 0px dimensions. We force `min-width: 20px` and `min-height: 3px` on `.card-accent-bar` in the clone to prevent this.
3.  **Per-Card Stabilization**: For individual card captures, we force `width: 320px` and `display: flex` on the target card to prevent it from stretching to fill the container width.

## 9. Credit System

Credits operate at two levels:

1. **Section-level Credits** (`credDisplay`): Shown at the bottom of each mode section. Contains contributor pills with colored names.
2. **Per-card Credits** (`.card-footer-credits`): Dynamically computed by `refreshAllCardCredits()`. Maps credit pills to specific cards.

**Three-Step Matching Logic (Priority Order):**

| Step | Method | Example |
|------|--------|---------|
| 1️⃣ Tag Priority | Exact/regex match of `.card-tag` text against pill labels | `"SLIME CITY 1"` matches pill `"SLIME CITY 1"` |
| 2️⃣ Title Priority | Exact/regex match of `.card-title` text (only if Step 1 fails) | `"Celestial"` matches pill `"CELESTIAL"` |
| 3️⃣ Number Fallback | Number/range match WITH strict location prefix verification | `"1"` in card + prefix `"HEROS PALACE"` must match pill prefix |

**Strict Context Check (Step 3):**
```javascript
// Card tag: "Slime City 1" → tagPrefix = "SLIME CITY"
// Pill label: "HEROS PALACE 1-2" → pPrefix = "HEROS PALACE"
// Number 1 is in range [1,2] ✓ BUT "SLIME CITY" ≠ "HEROS PALACE" ✗
// → REJECTED (prevents cross-section credit pollution)

// Pill label: "SLIME CITY 1" → pPrefix = "SLIME CITY"
// Number 1 matches ✓ AND "SLIME CITY" === "SLIME CITY" ✓
// → ACCEPTED → Injects "UNIT BY ytgravytraps"
```

> **NOTE**: Per-card credits are **only visible when downloading individual cards** (Node mode). In fullscreen download, they remain hidden — only section-level credits are shown.

> **⚠️ CRITICAL PITFALL**: This function exists in TWO files. See [Known Pitfalls](#️-dual-credit-functions-indexhtml-vs-rendererjs).

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

### Admin UI Helpers (admin.html)

Added visual indicators for editable elements in Admin mode:
- **Focus Indicator**: Elements with `contenteditable="true"` get a dashed cyan outline on hover.
- **Empty State**: `min-height` and `min-width` enforced on labels/titles to ensure they remain clickable even when empty.
- **Cursor**: `cursor: text` explicitly set on editable `div` elements via `rewireAll()`.

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

### Dynamic Component Layouts

Certain visual elements rely on dynamic CSS calculations to ensure layout stability across varying content lengths:
- **Character Connector Lines (`cards.css`)**: The visual lines connecting characters in a team use `height: calc(100% - 24px + var(--mem-gap))`. This guarantees that the line perfectly bridges the gap between circular numbers, regardless of whether a character's name or binding spans multiple lines. The line originates exactly at the bottom of the circle (`top: 24px`) to prevent visual overlap with the semi-transparent circular backgrounds.
- **Character Numbers (`cards.css`)**: Centered vertically and horizontally using modern `display: grid; place-items: center` logic, discarding brittle `padding-top` adjustments that previously caused misalignments depending on the font stack.

---

## 9. Key Functions Walkthrough

### `loadFromFirebase()` — Data Loading

```
1. Show "Loading..." status
2. GET /api/load
3. If response OK → parse JSON
4. For each mode in ALL_MODES:
   a. Find section element by PAGE_MAP[mode]
   b. Set innerHTML = DOMPurify.sanitize(data[mode + 'HTML'], config)
5. Call rewireAll() to restore editability and event listeners
6. Call refreshAllCardCredits()
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

**Current `onclone` Strategy (Targeted DOM Removal):**
```
1. .nav-header → physically .remove()'d from clone (NOT display:none)
   Reason: position:sticky leaves phantom space if only hidden
2. All HIDE_SEL elements → .remove()'d from clone
3. body, #appContent, #pageBody → padding/margin reset to 0
4. .mode-section.active .main-title → padding-top reduced to 12px
5. .card-accent-bar → min-width/height enforced (gradient crash guard)
6. Fullscreen: .card-footer-credits stays hidden (section-level credits only)
7. Node mode: .card-footer-credits explicitly shown (display:flex)
```

> ⚠️ **QoL Pending**: Despite `.nav-header` removal, a top gap may still appear
> in screenshots depending on browser scroll state. Full resolution tracked in
> [Known Pitfalls §11](#️-screenshot-top-gap-nav-header-sticky-residual-qol-pending).

### `enterAsAdmin()` / `enterAsGuest()`

```javascript
// Admin Mode
function enterAsAdmin() {
  currentRole = 'admin';
  document.body.classList.remove('readonly');
  document.body.classList.add('is-admin');
  loadFromFirebase(); // Forces a data refresh and runs rewireAll()
}

// Guest Mode
function enterAsGuest() {
  currentRole = 'guest';
  document.body.classList.add('readonly');
  document.body.classList.remove('is-admin');
  loadFromFirebase(); // Then rewireAll() strips admin elements
}

### `rewireAll()` — Event & Editability Restoration

This function is critical for restoring functionality to HTML loaded dynamically:
1.  **Block Draggin## 11. Known Pitfalls & Gotchas

> 🔍 **Audit Date**: 2026-04-30 | Skills applied: `wiki-architect`, `architect-review`, `security-auditor`, `differential-review`, `vibe-code-auditor`

---

### ✅ Dual Credit Functions Resolved (`credits.js`)

**STATUS**: Fixed — April 2026.

The credit matching function `refreshAllCardCredits()` previously existed in two separate locations. Now resolved:
- `shared/js/credits.js` contains `refreshAllCardCreditsCore()` exposed on `window`.
- Both `admin.html` and `index.html` delegate to this single source of truth.
- `renderer.js:67-71` wraps this call for admin use via ES module export.
- `index.html:442-446` wraps it for guest use via inline script.

> ⚠️ **Note from Vibe-Code-Auditor**: Two separate `buildCard()` implementations still exist: one in `renderer.js` (admin, uses `contenteditable`) and one in `index.html:363` (guest, read-only). This is intentional (dual-mode isolation) but must be kept in sync manually.

---

### ✅ html2canvas InvalidStateError (0-Dimension Canvas) — RESOLVED

**ISSUE:** `InvalidStateError: Failed to execute 'createPattern' on 'CanvasRenderingContext2D': The image argument is a canvas element with a width or height of 0.`

**ROOT CAUSE (Vibe Auditor):** `html2canvas` 1.4.1 internally calls `createPattern()` on a temp canvas generated from any CSS `linear-gradient`. If the element has collapsed to 0×0 (due to flex layout or `position:fixed` offset), the temp canvas is empty → crash.

**Elements Identified as Culprits:**
| Element | Location | Gradient |
|---------|----------|----------|
| `.scroll-progress` | `base.css:26` | `var(--gold)` → `var(--cyan)` |
| `.card-accent-bar` | `cards.css:55` | `var(--tc)` → `transparent` |
| `.section-label::before/after` | `base.css:70` | `transparent` → `var(--gold)` → `transparent` |
| `.mem-row::after` | `cards.css:114` | `rgba(255,255,255,0.1)` |

**FIX — Nuclear Option (in `onclone` callback, `index.html:477-504`):**
1. `* { background-image: none !important; }` — disables ALL gradients in clone DOM.
2. `.card-accent-bar` → solid `background-color: var(--tc)` fallback.
3. `.scroll-progress { display: none !important; }` — hidden in clone.
4. `ignoreElements` skips `.nav-header` and `#scrollProgress` at DOM level.
5. `gsap.set("#scrollProgress", { width: "0%" })` prevents bar from starting at 100%.

> ⚠️ If new elements using `linear-gradient` are added, add their selector to the `onclone` style block.

---

### ✅ Scroll Progress Bar Stuck / Starting at 100% — RESOLVED

**ISSUE:** `#scrollProgress` showed 100% on page load without any user scroll.

**ROOT CAUSE (Differential-Review):** `initScrollAnimations()` was being called multiple times:
- On first load via `initScrollAnimations()` at document end (`index.html:766`)
- On every `switchMode()` call (`index.html:315-318`)
- On every `rewireAll()` call via the wrapper function (`index.html:763-767`)

This created **stacked ScrollTrigger instances** that accumulated incorrect state, with the combined final value resolving to 100% immediately.

**FIX (`index.html:692-715`):**
- `ScrollTrigger.getAll().forEach(t => t.kill())` — kills all previous instances before re-init.
- `gsap.set("#scrollProgress", { width: "0%" })` — hard reset on each call.
- `trigger: "html"` + `invalidateOnRefresh: true` — accurate height calculation.
- `ScrollTrigger.refresh()` — forces recalculation after DOM mutations.

---

### ⚠️ Server-Side Sanitization Bypassed (`api/save.js:27-38`)

**ACTIVE RISK.** Code block at `save.js:28` reads:
```javascript
const sanitizedData = data; // bypassed — see comment
```
The DOMPurify block is commented out due to `isomorphic-dompurify` causing 500 errors on Vercel.

**Current Mitigations (in priority order):**
1. Client-side `DOMPurify.sanitize()` in `admin.html` before every POST.
2. 2MB payload size limit at `save.js:17-20`.
3. CORS restricted to `https://testzone-eight.vercel.app` only.
4. Firebase Auth token required for write access.

**Residual Risk**: A compromised admin session or direct API call bypasses all client-side protection.

---

### ⚠️ CORS Header Missing `x-admin-password` (`vercel.json:26`)

**Differential-Review Finding.** The CORS preflight response for `/api/(save|login)` lists:
```json
"Access-Control-Allow-Headers": "Content-Type, Authorization"
```
But `x-admin-password` is sent as a **custom header** in requests. The browser preflight (`OPTIONS`) will **block** cross-origin requests if `x-admin-password` is not listed here.

> This works only because the app is currently same-origin. If moved to a different domain or tested via third-party tools, this will fail.

**Fix**: Add `x-admin-password` to `vercel.json`:
```json
"Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-password"
```

---

### ⚠️ `SECURITY.CLOUD_CONFIG` Allows `onclick` in Sanitized HTML (`index.html:278`)

**Security-Auditor Finding.** The DOMPurify config for Firebase-loaded data includes:
```javascript
ADD_ATTR: ['onclick', 'ondblclick', ...]
```
This means if a compromised Firebase record contains `onclick="maliciousCode()"`, DOMPurify will **allow** it through when using `CLOUD_CONFIG`. This is intentional for admin preview rendering but creates a stored XSS surface.

**Mitigation**: Only use `CLOUD_CONFIG` in admin context — never apply it when rendering data in guest `index.html`.

---

### ⚠️ Monolithic Script Blocks (`index.html`)

`index.html` contains large inline `<script>` blocks (~400 lines). A **single syntax error** anywhere causes the **entire block to fail silently**.

**Mitigation:** Use the syntax checker:
```bash
node scratch/check_syntax.js
```

---

### ⚠️ Duplicate `buildCard()` Implementations

| File | Purpose | Notable Difference |
|------|---------|-------------------|
| `renderer.js:12-65` | Admin use (ES module) | `contenteditable="true"`, drag handles, admin buttons |
| `index.html:363-400` | Guest use (inline script) | Read-only, no admin controls, no drag |

Both must stay in sync when card **structure** (not behavior) changes. The DOM output structure must be identical for `credits.js` matching to work.

---

### ⚠️ `load.js` Fetch Has No Timeout

**Vibe-Code-Auditor Finding.** `api/load.js:11`:
```javascript
const response = await fetch(finalUrl); // no timeout!
```
If Firebase is slow or unresponsive, this will hang the Vercel function indefinitely until the platform's default 10s limit kills it, resulting in a 504 Gateway Timeout for the user.

**Fix**:
```javascript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 8000);
const response = await fetch(finalUrl, { signal: controller.signal });
clearTimeout(timeout);
```

---

### ⚠️ `window.onload` vs `DOMContentLoaded`

`window.onload` fires **after** `DOMContentLoaded`. If both are used, `window.onload` can overwrite state. A problematic `window.onload = () => enterAsGuest()` in `admin.html` was removed — it was resetting admin mode to guest.

---

### ⚠️ HTML as Database (Architectural Debt)

**Architect-Review Finding.** The app stores fully rendered HTML in Firebase, not structured data. This creates:
- No easy data migration path
- XSS risk if server-side sanitization fails
- Large payload sizes (full DOM trees stored per mode)
- No queryability or filtering

**Recommended Future Direction**: Migrate to a JSON data model (team name, members array, tag, color) and render in the browser — decoupling data from presentation.

---

### ⚠️ CSS Z-Index Collisions

`#adminShortcutOverlay` has `z-index: 99999`. If not properly hidden with `display: none`, it blocks all click events beneath it silently.

---

### ⚠️ Cache Busting for Admin Scripts

`admin.html` loads scripts with version query strings (e.g., `?v=1.1.2`). **Increment the version** when `admin.js`, `renderer.js`, or any imported module changes, otherwise browsers serve stale code.

### ⚠️ Screenshot Top Gap — `.nav-header` Sticky Residual *(QoL Pending)*

**ISSUE:** Full-screen screenshots show an empty gap above the guide title (e.g., "STORY MODE GUIDE") roughly the height of the navigation bar.

**ROOT CAUSE:** `.nav-header` uses `position: sticky; top: 0`. When hidden via `display: none`, `html2canvas` still accounts for the layout space it occupied before hiding. Physically removing it with `.remove()` in `onclone` collapses the space in the cloned DOM, but the **actual captured area is based on `document.body`'s bounding box at capture time**, which still reflects the pre-removal scroll position.

**Attempted Fixes:**
1. `display: none` on `.nav-header` → ❌ Sticky space preserved
2. `padding-top: 0` on `body` / `#pageBody` → ❌ Nav space still included
3. `.nav-header.remove()` in `onclone` → ❌ Partially works but gap persists in some browsers

**Recommended Next Steps:**
- Option A: Capture `#pageBody` or `#appContent` element directly instead of `document.body`, providing `backgroundColor` explicitly.
- Option B: Use `html2canvas` `y` / `windowTop` scroll offset to clip the top.
- Option C: Temporarily scroll to top (`window.scrollTo(0,0)`) before capture and restore afterward.

> **Status**: 🕐 QoL Pending — deferred to next development session.

---

### ✅ `addNewStoryCoreTeam` / `addNewStoryTeam` ReferenceError — RESOLVED

**ISSUE:** Admin Story section buttons threw `Uncaught ReferenceError: addNewStoryCoreTeam is not defined`.

**ROOT CAUSE:** The `onclick` handlers in `admin.html` Story section referenced global functions that were not exposed on `window`. The functions `addGenericCoreTeam()` and `addGenericNewTeam()` existed internally but their Story-specific aliases were missing.

**FIX (`shared/js/admin.js`):**
```javascript
window.addNewCoreTeam  = () => addGenericCoreTeam('coreGrid', AppState.currentMode);
window.addNewTeam      = () => addGenericNewTeam('newGrid',  AppState.currentMode);
// Story aliases
window.addNewStoryCoreTeam = () => addGenericCoreTeam('storyCoreGrid', 'story');
window.addNewStoryTeam     = () => addGenericNewTeam('storyNewGrid',  'story');
```

> **Note**: All mode-specific grid functions now follow the same `addGenericCoreTeam(gridId, mode)` pattern.

---

### ✅ CORS `x-admin-password` Header Gap — RESOLVED

**ISSUE:** `vercel.json` CORS `Access-Control-Allow-Headers` was missing `x-admin-password`, which would block cross-origin admin saves via browser preflight.

**FIX (`vercel.json`):**
```json
"Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-password"
```

> **Status**: Fixed in this session (2026-05-01). See also `SecurityNeedToFix.md MED-06`.

---

### ✅ Card Screenshot Button Inactivity (DOMPurify Sanitization) — RESOLVED

**ISSUE:** The "Screenshot" buttons on individual cards were non-functional in Guest mode.

**ROOT CAUSE:** `DOMPurify` sanitization (specifically `MED-05` guard) strips all `onclick` attributes to prevent XSS. Since the cards are loaded dynamically from Firebase, the inline handlers were removed, leaving the buttons "frozen."

**FIX (`index.html` & `shared/js/admin.js`):**
Implemented **Event Delegation**. A global click listener detects clicks on `.download-node-btn` and triggers `openDlModal(btn)` manually. This bypasses the need for inline `onclick` attributes while maintaining strict security.

---

## 12. Architecture Decision Records (ADR)

> Added by `architect-review` skill — 2026-04-30

### ADR-001: Dual-File Architecture (Guest + Admin)
- **Decision**: Maintain two separate HTML entry points (`index.html` guest, `admin.html` CMS).
- **Rationale**: Security isolation — admin controls are never sent to guest browsers, eliminating a class of client-side privilege escalation.
- **Trade-off**: Code duplication in `buildCard()` and other shared functions.
- **Status**: Accepted.

### ADR-002: Classic Script for `credits.js` (No ES Module)
- **Decision**: Load `credits.js` as a classic `<script>` tag, not as a module.
- **Rationale**: `index.html` uses inline scripts that cannot import ES modules. Using IIFE pattern on `window` allows sharing without a bundler.
- **Trade-off**: Less type safety; global namespace pollution (`window.refreshAllCardCreditsCore`).
- **Status**: Accepted.

### ADR-003: Client-Side-Only Sanitization (Temporary)
- **Decision**: Bypass server-side DOMPurify due to Vercel/isomorphic-dompurify incompatibility.
- **Rationale**: Prevents 500 errors in production; client-side sanitization provides partial mitigation.
- **Trade-off**: Direct API callers bypass all sanitization.
- **Status**: Open — requires future resolution (see `SecurityNeedToFix.md CRIT-01`).

### ADR-004: html2canvas Targeted DOM Removal in `onclone`
- **Decision**: Physically `.remove()` layout-affecting elements (`.nav-header`) instead of `display:none`, and enforce minimum dimensions on gradient elements.
- **Rationale**: `position:sticky` elements leave phantom height even when `display:none`. Removal is the only reliable way to collapse that space. Targeted approach also avoids the "Nuclear Option" of stripping all `background-image` values, preserving gradient aesthetics.
- **Trade-off**: Screenshots are still slightly affected by browser scroll state — a pending QoL item.
- **Previous Decision**: Global `* { background-image: none !important }` (Nuclear Option) — abandoned because it stripped visual identity without fully resolving the layout gap.
- **Status**: Accepted (with QoL pending).

### ADR-005: Event Delegation for Dynamic UI Triggers
- **Decision**: Use `document.addEventListener('click', ...)` delegation for all critical UI triggers (e.g., screenshot buttons) instead of inline `onclick`.
- **Rationale**: Allows content to be sanitized via `DOMPurify` (stripping all event handlers) without losing functionality. Maintains a high security posture (`MED-05`) while ensuring dynamic elements remain interactive.
- **Trade-off**: Slightly higher code complexity; requires checking `e.target.closest()`.
- **Status**: Accepted.

---

> **For new developers / AI agents**: Start with `shared/js/config.js` for constants, then `shared/js/renderer.js` for how data becomes UI.
> **Critical Rule**: When modifying credit matching, test ALL 7 modes and check BOTH `renderer.js` (admin path) and `index.html:442` (guest path).
> **Security Rule**: Never add `onclick` to `SECURITY.ALLOWED_ATTR` — it opens stored XSS. Only `CLOUD_CONFIG` (admin-only) may include event handlers.
