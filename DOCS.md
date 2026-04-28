# 📘 Team Composition Guide — Technical Documentation

> **Project**: `team-composition-guide` v1.0.0  
> **Repository**: [AnotherUserU/imlosttho](https://github.com/AnotherUserU/imlosttho)  
> **Platform**: Vercel (Serverless)  
> **Database**: Firebase Realtime Database  
> **Last Updated**: 2026-04-27 (Hardening & Admin UI Overhaul)

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
├── admin.html              # Admin CMS (Modules enabled)
├── index.html              # Guest view (Read-only)
├── DOCS.md                 # Technical Documentation
├── vercel.json             # Vercel configuration & security
│
├── api/                    # Vercel Serverless Functions
│   ├── login.js            # Password -> JWT Auth
│   ├── load.js             # Firebase GET proxy
│   └── save.js             # Firebase PUT proxy (JWT Required)
│
├── shared/                 # Shared resources
│   ├── js/                 # Modular JavaScript logic
│   │   ├── admin.js        # [ENTRY] Master modular logic
│   │   ├── admin.min.js    # [PROD] Obfuscated bundle
│   │   └── ...             # Other JS modules (state, renderer, etc.)
│   └── styles/             # Modular CSS system
│       ├── main.css        # [ENTRY] CSS Import master
│       ├── variables.css   # Design tokens & Themes
│       ├── base.css        # Global resets & Layout
│       ├── navigation.css  # Header & Menu UI
│       ├── cards.css       # Team & Member styles
│       ├── components.css  # Toasts, Banners, Pills
│       ├── modals.css      # Popups & Overlays
│       └── admin.css       # Admin-only tools & logic
```

> **SECURITY NOTE**: The `admin.html` file now uses `admin.min.js`. This is a highly obfuscated version of the master `admin.js` to prevent unauthorized users from understanding the internal logic, API interactions, or authentication flows even if they view the script source.

---

## 4. Design System & CSS Modules

Project ini menggunakan arsitektur CSS modular untuk mempermudah pemeliharaan:

| File | Deskripsi |
|------|-----------|
| `variables.css` | Mendefinisikan color palette, spacing, dan transisi untuk tema Dark/Light. |
| `base.css` | Reset CSS global, tipografi (Rajdhani/Orbitron), dan layout dasar `<body>`. |
| `navigation.css` | Mengatur tampilan Header, Navigasi Tab, Search Bar, dan transisi `scrolled`. |
| `cards.css` | Logika visual untuk Team Grid, Kartu Anggota, dan layout kartu tim. |
| `components.css` | Gaya untuk elemen reusable: Toasts, Banners, Mp-Pills, dan Credits box. |
| `modals.css` | Mengatur semua overlay modal, animasi popup, dan input form di dalam modal. |
| `admin.css` | Mengatur visual Drag-and-Drop, tombol editor, dan pembatasan mode `readonly`. |

---

## 5. Data Model

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
I'm using the `@api-documentation-generator` skill to provide precise endpoint specifications:

### `POST /api/login`
Authenticates admin and returns a session JWT.
- **Request Body**: `{ "password": "..." }`
- **Success (200)**: `{ "success": true, "token": "JWT_STRING" }`
- **Error (401)**: `{ "error": "Wrong password" }` (Includes 2s delay)

### `GET /api/load`
Fetches the entire guide dataset. Public access.
- **Response**: Full JSON object containing all mode HTML strings.

### `POST /api/save`
Updates the guide data. **JWT Required.**
- **Header**: `Authorization: Bearer <token>`
- **Request Body**: `{ "data": { ... } }`
- **Error (413)**: If payload > 2MB.

---

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
  const HIDE_SEL = '.edit-btn,.delete-mem,.delete-team-btn,...';
  document.querySelectorAll(HIDE_SEL).forEach(el => el.remove());
}
```

> **TIP**: Elements are **removed from the DOM**, not hidden with CSS. This means even if a user inspects the page, admin controls don't exist in the DOM tree.

### 6.1 Code Obfuscation (Admin Logic)

To prevent unauthorized users from reverse-engineering the admin dashboard, the core logic is obfuscated using `javascript-obfuscator`.

- **Master File**: `shared/js/admin.js` (Readable source code).
- **Production File**: `shared/js/admin.min.js` (Encrypted/Acak).
- **Features Enabled**:
    - **Self-Defending**: Code breaks if tampered with or prettified.
    - **Dead Code Injection**: Adds decoy logic to confuse analyzers.
    - **String Array Rotation/Encoding**: Encrypts sensitive strings (API endpoints, identifiers).
    - **Debug Protection**: Attempts to block browser DevTools if it detects inspection of the script.

**How to update obfuscated code:**
```bash
# After editing shared/js/admin.js
javascript-obfuscator shared/js/admin.js --output shared/js/admin.min.js [options]
```

> 🛑 **CRITICAL DEPLOYMENT WARNING** 🛑
> Setiap kali Anda melakukan perubahan pada file JavaScript di dalam `shared/js/` (terutama `admin.js`), **Anda WAJIB menjalankan perintah obfuscator di atas SEBELUM melakukan `git commit` & `git push`**. 
> Jika Anda lupa meng-obfuscate, versi production web Anda (yang membaca `admin.min.js`) **TIDAK AKAN** mendapatkan update terbaru yang Anda tulis, yang bisa menyebabkan bug yang sangat membingungkan saat dideploy ke Vercel.

---

## 7. Frontend Architecture

### Modular Module Strategy

**admin.html** & **index.html** sekarang berfungsi sebagai shell minimal yang memuat modul dari `shared/js/`.

- **Entry Point**: `shared/js/admin.js` (memuat semua sub-modul).
- **Core Logic**: Terbagi ke dalam `renderer.js`, `drag.js`, `firebase.js`, dan `utils.js`.
- **State Management**: Terpusat di `state.js` menggunakan pola singleton.

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

### Admin UI Helpers (admin.html)

Added visual indicators for editable elements in Admin mode:
- **Focus Indicator**: Elements with `contenteditable="true"` get a dashed cyan outline on hover.
- **Empty State**: `min-height` and `min-width` enforced on labels/titles to ensure they remain clickable even when empty.
- **Cursor**: `cursor: text` explicitly set on editable `div` elements via `rewireAll()`.

### Stylesheet Architecture

```
variables.css    → Design tokens (Warna, Font, Transisi)
base.css         → Reset, typography, layout global
navigation.css   → Header, Nav Tabs, Search, Role Badge
cards.css        → Team Cards, Grids, Member Rows
components.css   → Toasts, Banners, Mp-Pills, Credits
modals.css       → Semua overlay modal & popups
admin.css        → Drag indicators, editor tools, readonly overrides
main.css         → CSS Entry Point (Import Master)
```

---

## 9. Key Functions Walkthrough

### 9.1 The Modular System
I'm using the `@code-documentation-code-explain` skill to break down the new modular flow:

1. **`shared/js/config.js`**: Central truth for `PAGE_MAP`, `ALL_MODES`, and `SECURITY` settings.
2. **`shared/js/state.js`**: Tracks `AppState.currentRole` and `AppState.dragCard` to prevent logic collisions during complex UI interactions.
3. **`shared/js/drag.js`**: A specialized engine that manages:
    - **Block Dragging**: Reordering entire sections.
    - **Card Dragging**: Moving team cards between grids.
    - **Member Dragging**: Reordering units within a single card (triggers `renumMembers`).

### 9.2 Credit Matching Logic (`renderer.js`)
The `refreshAllCardCredits` function performs a "Smart Scan":
- It reads contributor pills from the section footer.
- It parses number ranges (e.g., "1-10").
- It extracts numbers from team titles (e.g., "Team 5").
- If the team number falls within the contributor's range, it injects the "UNIT BY [Name]" badge into that card.

---

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

### ⚠️ ES6 Module Loading

Karena menggunakan `<script type="module">`, modul JavaScript dimuat secara *asynchronous*. Fungsi yang didefinisikan di dalam modul (seperti `switchMode`) harus diekspos ke `window` secara eksplisit agar bisa dipanggil dari atribut `onclick` di HTML.

**Contoh:**
```javascript
window.switchMode = switchMode;
```

### ⚠️ Obfuscation Out-of-Sync

Setiap kali melakukan perubahan pada `shared/js/admin.js`, Anda **WAJIB** menjalankan obfuscator untuk memperbarui `admin.min.js`. Jika tidak, perubahan tersebut tidak akan muncul di browser karena `admin.html` memanggil file `.min.js`.

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

> **For new developers / AI agents**: Start by reading `shared/js/state.js` for the data model, then `shared/js/admin.js` for the application lifecycle and entry point. The core logic is now fully modularized in `shared/js/` (Renderer, Drag engine, Firebase bridge), while `admin.html` serves only as a shell with ES6 module entry point.
