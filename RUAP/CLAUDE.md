# RUAP Attività Diurne — Implementation

This is a specialized demo for RUAP (Attività Diurne) with pre-configured doctors and sedi. Built on the same shift manager architecture as gestoreturni, but optimized for immediate demo use with baked-in configuration.

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
- **localStorage** — Persists doctor/assignment/config state (keys: ruap-config-v2, ruap-staff-v2, ruap-assignments-v2)

Config-driven approach means non-technical users can modify `config.js` without touching app logic.

## Key Patterns

**Assignment key format:** `YYYY-MM-DD_slotKey_placeName` (e.g., `2026-04-07_mat_M.S.Savino`)
- Central to calendar rendering, hour calculations, export, and auto-assign logic
- Composite key replaces separate fields for maximum clarity

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
- `ruap-config-v2` — roles, shifts, activities (mirrored from CONFIG on first run)
- `ruap-staff-v2` — doctor objects with preferredPlace + unavailability
- `ruap-assignments-v2` — shift assignments (key → staffId mapping)

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

## Pending Tasks

Implementation plan: `docs/superpowers/plans/2026-04-07-ruap-demo-ready.md`

- **Task 5:** Auto-assign with preference priority (⭐ indicator in dropdown for preferred doctors)
- **Task 6:** PDF export (monthly schedule table per sede using jspdf/html2canvas)
- **Task 7:** Visual polish (calendar cells, dropdown width, responsive improvements)
- **Task 8:** Pre-fill April 2026 with ~70% realistic assignments (~4 weeks, respecting preferences + unavailability)

## Development

No build step. Tailwind CDN + vanilla JS. Open `index.html` directly or serve locally:
```bash
cd RUAP && npx serve .
```

Manual browser testing only. Demo-ready when all 8 tasks complete.
