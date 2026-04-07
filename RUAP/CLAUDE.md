# RUAP Attività Diurne — Implementation

This is a specialized demo for RUAP (Attività Diurne) with pre-configured doctors and sedi. Built on the same shift manager architecture as `../gestoreturni`, but optimized for immediate demo use with baked-in configuration.

**Relationship to gestoreturni:** RUAP shares the core state management (`app.js`) and rendering pipeline with gestoreturni. Both projects:
- Use Tailwind CDN + vanilla JS (no build step)
- Persist state to localStorage (keys prefixed with `ruap-*` for historical reasons)
- Support toast notifications, dark mode, auto-assign, and PDF export
- Have no backend or external dependencies

Main differences: RUAP uses `config.js` (pre-configured doctors/sedi), gestoreturni allows full CRUD via UI settings.

## Quick Start

- Edit **`config.js`** to modify doctors, sedi, shifts (no code changes needed)
- Run: `npx serve .` in the RUAP directory
- Open browser to `http://localhost:8000`
- First run loads demo data with dismissible banner: "Stai vedendo dati di esempio..."

## Configuration

### config.js Structure

```javascript
const CONFIG = {
  places: ['M.S.Savino', 'Subbiano'],  // Sedi (locations)
  slots: [                              // Shift times
    { key: 'mat', label: '08:00–14:00', hours: 6, icon: '🌅' },
    { key: 'pom', label: '14:00–20:00', hours: 6, icon: '🌆' },
  ],
  doctors: [                            // Pre-configured doctors
    { name: 'Dott. Savianu', patients: 850, colorIndex: 0, preferredPlace: 'M.S.Savino' },
    // ... more doctors
  ]
}
```

### How to Modify

**Add a doctor:**
```javascript
doctors: [
  // ... existing
  { name: 'Dott. NewDoctor', patients: 850, colorIndex: 7, preferredPlace: 'M.S.Savino' },
]
```

**Change a sedi name:**
```javascript
places: ['M.S.Savino RENAMED', 'Subbiano'],
```

**Update preferred place:**
```javascript
doctors: [
  { name: 'Dott. Savianu', patients: 850, colorIndex: 0, preferredPlace: 'Subbiano' },  // changed
]
```

**Swap shift times:**
```javascript
slots: [
  { key: 'mat', label: '07:00–13:00', hours: 6, icon: '🌅' },  // changed
  { key: 'pom', label: '13:00–19:00', hours: 6, icon: '🌆' },  // changed
]
```

## Architecture

- **config.js** — Loaded before app.js, seeds first run with doctors/sedi/shifts
- **index.html** — Structure + toast container + PDF content div
- **app.js** — All logic (state, rendering, toast system, auto-assign, PDF export)
- **localStorage** — Persists doctor/assignment/config state (keys: ruap-turni-medici, ruap-turni-assegnazioni, ruap-dark-mode)

Config-driven approach means non-technical users can modify `config.js` without touching app logic.

## Key Patterns

**Assignment key format:** `YYYY-MM-DD_slotKey_placeName` (e.g., `2026-04-07_mat_M.S.Savino`)
- Central to calendar rendering, hour calculations, export, and auto-assign logic
- Composite key replaces separate fields for maximum clarity

**`cleanDoctorName(name)`** — strips `'Dott. '` prefix; used in calendar cells and PDF output.

**preferredPlace field:** Doctor's preferred location — impacts auto-assign priority order:
1. Doctors with preferred place + fewest weekly hours
2. Doctors with no preference + fewest weekly hours
3. Doctors preferring other places (only if 1-2 exhausted)

**Toast notifications:** Replaced all `alert()`/`confirm()` dialogs:
- 4 types: success (green ✓), warning (⚠️ amber), error (✗ red), info (ℹ️ blue)
- Fixed position bottom-right, 3-second auto-dismiss
- Examples: import success/error, AI assignment, delete confirmation

## Data Persistence

**localStorage keys:**
- `ruap-turni-medici` — doctor objects array (JSON)
- `ruap-turni-assegnazioni` — shift assignments map (JSON)
- `ruap-dark-mode` — `'true'`/`'false'` string

**First-run behavior:** If no localStorage exists, loads CONFIG doctors + shows demo banner. Banner dismissible; wizard accessible via Settings → "Ricomincia la Configurazione Guidata".

**Import/Export:** JSON backup works with v2 schema including preferredPlace field.

## Data Schema

**Doctor object (from CONFIG):**
```javascript
{
  id: string (generated on first run),
  name: string (e.g., 'Dott. Savianu'),
  patients: number (determines weeklyHours: ≤400→38h, ≤1000→24h, ≤1200→12h),
  weeklyHours: number (calculated from patients),
  colorIndex: number (0-7, maps to COLOR_PALETTE),
  preferredPlace: string (sede name, e.g., 'M.S.Savino') | null,
  availability: { lun/mar/mer/gio/ven: { mat: bool, pom: bool } },
  unavailPeriods: array
}
```

**Assignment key format:** `YYYY-MM-DD_slotKey_placeName`
- Example: `2026-04-07_mat_M.S.Savino`
- Immutable and used across calendar, PDF export, auto-assign, and import/export
- `slotKey`: `mat` or `pom`
- `placeName`: must match exactly a place from CONFIG.places

**Assignment map:** `{ slotKey: doctorId, ... }`
- Maps assignment keys to doctor IDs
- Example: `{ '2026-04-07_mat_M.S.Savino': 'doc-abc123', ... }`

**App state:**
```javascript
{
  doctors: array of doctor objects,
  assignments: { slotKey: doctorId, ... },
  calYear: number,
  calMonth: number (0-11),
  sidebarWeekStart: Date,
  editingDoctorId: string | null,
  activeSlotKey: string | null
}
```

## Features Implemented

- Auto-assign with 3-tier priority (⭐ preferred place → no preference → other places)
- PDF export — landscape, table per sede, html2canvas → jsPDF
- Reset Turni button — clears assignments only, preserves doctors and preferences
- Dark mode toggle — persisted in `ruap-dark-mode` localStorage key
- Smart dropdown positioning — appears above the button if insufficient space below (`DROPDOWN_HEIGHT = 350`)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Assignments not saving** | Check browser localStorage quota (DevTools → Application → Storage). Clear via Settings → "Ripristina Dati Iniziali" or reset localStorage manually |
| **Demo banner won't dismiss** | Click the X button. If localStorage is full or corrupted, use DevTools to clear `ruap-*` keys and reload |
| **Auto-assign skips all doctors** | Verify doctors have `preferredPlace` matching a CONFIG.places entry exactly. Check spelling; `'M.S.Savino'` ≠ `'M.S. Savino'` |
| **Colors not matching config** | Verify `colorIndex` (0-7) matches available colors in `COLOR_PALETTE`. Index >7 falls back to default |
| **PDF export blank or cut off** | Try landscape orientation (already set). If table overflows, reduce doctor count or increase page width. Check browser zoom (100%+) |
| **Hours wrong after import** | Verify import JSON has correct schema: `{ id, name, patients, weeklyHours, colorIndex, preferredPlace, availability, unavailPeriods }`. Missing `weeklyHours` causes calculation errors |
| **Dropdown appears below fold** | Mobile viewport: dropdowns positioned via `DROPDOWN_HEIGHT = 350`. On very small screens, may extend off-screen. Use dropdown sparingly on mobile |

## Development

No build step. Tailwind CDN + vanilla JS. Open `index.html` directly or serve locally:
```bash
cd RUAP && npx serve .
```

Manual browser testing only. Demo-ready when all 8 tasks complete.
