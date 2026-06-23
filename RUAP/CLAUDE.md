# RUAP Attività Diurne — Implementation

Specialized shift manager for RUAP (Attività Diurne) with pre-configured doctors and sedi. Built on the same architecture as `../gestoreturni`, but config-driven and optimized for monthly budget tracking.

**Relationship to gestoreturni:** Both use Tailwind CDN + vanilla JS, same localStorage prefix (`ruap-*`), same assignment key format, toast system, conflict detection, and undo/redo. RUAP adds monthly budgets, Excel import/export, and the "Genera Mese" algorithm.

## Quick Start

```bash
cd RUAP && npx serve .
# Open http://localhost:8000 — first run auto-loads config.js doctors
```

## Architecture

- **config.js** — 16 doctors (10 primary + 6 pool), 2 places, 2 shift slots. Loaded before app.js.
- **index.html** — Tailwind CDN, FontAwesome, jsPDF, html2canvas, **xlsx (SheetJS)** for Excel
- **app.js** (~2110 lines, refactored Jun 2026) — All logic. Read with offset/limit. Refactored: bug fixes, extracted helpers (`assignDoctor`, `removeAssignment`, `sumSlotHours`, `el`), split long functions (importFromRows, runAutoAssignForMonth, buildPdfContent, openAssignDropdown, renderCalendarWeek/Month), 18 section banners, reorganized into 19 logical sections within single file. See section headers for navigation.
- **localStorage** — keys: `ruap-turni-medici`, `ruap-turni-assegnazioni`, `ruap-turni-history`, `ruap-dark-mode`

## Data Schema

### Doctor object
```javascript
{
  id: string,
  name: string (e.g. 'Dott. Savianu'),
  patients: number,                     // → weeklyHours via formula
  weeklyHours: number,                  // override-able in config.js
  monthlyBudget: number | undefined,    // if unset = weeklyHours × 4
  isPool: boolean,                      // true = "disponibilità aggiuntiva" (2nd priority)
  colorIndex: number (0-15),
  preferredPlace: string | null,
  availability: { lun/mar/mer/gio/ven: { mat: bool, pom: bool } },
  unavailPeriods: array,
  aft: string,
  seniority: number,
}
```

### Assignment key
`YYYY-MM-DD_slotKey_placeName` — e.g., `2026-06-10_mat_M.S.Savino`

- slotKey: `mat` (08-14, 6h) or `pom` (14-20, 6h)
- placeName: must match `CONFIG.places` exactly

### Monthly budget system
- **Primary doctors** (10): `monthlyBudget = weeklyHours × 4` (default 24×4=96h)
- **Pool doctors** (6): `monthlyBudget = 24` (fixed), `isPool: true`
- `getMonthlyBudget(doc)` — returns `monthlyBudget` if set, else `weeklyHours × 4`
- `getAssignedHoursInMonth(docId, month, year)` — sums all slot hours for a doctor in a calendar month
- `getRemainingMonthlyHours(doc, month, year)` — `budget - assigned`

## Features

### Standard
- Manual slot assignment (click empty slot → dropdown with availability/hour bar)
- Weekly sidebar with per-doctor hour progress bar
- Monthly/weekly calendar toggle
- PDF export (html2canvas → jsPDF, landscape, table per sede)
- Dark mode, conflict detection with resolution modal
- Undo/Redo (50-state stack, Ctrl+Z / Ctrl+Y)
- Copy/paste week assignments
- JSON export/import for backup

### Monthly budget features (new 2026-06)
- **Bilancio Mensile** — collapsible sidebar panel: per-doctor `used / budget` + progress bar. Click heading to toggle.
- **Import XLSX** — parses the same tabular Excel format ("turni Giugno CdC MODIFICATI.xlsx"):
  - Assignment sections: `Struttura | Data | Giorno | Turno | Medico Assegnato`
  - Debt table (col A-B): sets `monthlyBudget` = remaining hours
  - Pool table (col D-E): sets `monthlyBudget` + `isPool` on matched doctors
  - Matches doctors by surname (handles "Savianu Emanuel" ↔ "Dott. Savianu")
- **Export XLSX** — generates identical Excel format with current month's assignments + remaining hour summary
- **Genera [Mese]** — fills next month weekdays:
  1. Primary doctors sorted by remaining hours → first priority (preferred place > neutral > other)
  2. Pool doctors → second priority (same sub-priority)
  3. Within each group: doctor with most remaining monthly hours gets the slot
  4. Leaves unfilled slots where capacity is exhausted (= "SCOPERTO!")
  5. Uses the same progress bar overlay as Auto-Assegna

### Auto-Assegna Mese
Original local algorithm (weekly hours, not monthly). Fills current month with 3-tier preferred-place priority. `isPool` is ignored — all doctors treated equally.

## First-run behavior
1. No localStorage → `getDefaultDoctors()` loads from `config.js` → `saveToStorage()`
2. No wizard shown. Setup button restarts wizard (manual config).
3. Doctors are pre-populated with 16 entries. Users can edit/remove via modal.

## Key gotchas
- **COLOR_PALETTE** has 16 entries (index 0-15). `colorIndex` in config must match. Index >15 wraps to `COLOR_PALETTE[0]`.
- **`config.js` is the single source of truth** for initial doctor list. Change config → clear localStorage to reload.
- **weeklyHours override** in config.js: set `weeklyHours: 6` on pool doctors, overriding the patient-count formula.
- **monthlyBudget** in config is optional. If unset, `weeklyHours × 4` is used. After Excel import, it's overwritten with remaining hours.
- **Import matches by surname only** — "Savianu Emanuel" in Excel matches "Dott. Savianu" in app. Ensure surnames are unique.
- **Generate target = next month** from current calendar view. Generate from June → fills July. Does NOT touch the current month.
- **No test suite** — manual browser testing.
- **xlsx CDN** required for import/export. If CDN fails, buttons show toast error.
