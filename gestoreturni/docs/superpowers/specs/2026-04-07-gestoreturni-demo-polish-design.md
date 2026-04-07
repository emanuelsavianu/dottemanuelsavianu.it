# Gestore Turni — Demo Polish & UX Overhaul

**Date:** 2026-04-07
**Status:** Approved
**Goal:** Make the shift manager demo-ready: professional look, self-explanatory UX, pre-loaded realistic data, usable by non-technical doctors.

## Context

The app is a shift management tool for Continuita' Assistenziale / Guardia Medica. Built as static HTML + vanilla JS with Tailwind CDN. Two files: `gestoreturni.html` and `app.js`. All data in localStorage.

**Demo scenario:** Pre-loaded state shown to a group. No wizard walkthrough — the app opens with a populated calendar and the presenter demonstrates editing, assigning, and PDF export.

## 1. Visual Design System

### Header
- Gradient background: `#0f172a` to `#1e3a8a`
- Title: `text-xl`, icon + "Gestore Turni" branding
- Action buttons: grouped right, slightly larger padding (px-4 py-2), clear Italian labels
- Subtle bottom shadow for depth

### Color Palette
- Primary: `#1e40af` (blue)
- Accent: `#f59e0b` (gold, for highlights and toasts)
- Backgrounds: slate grays (`#f8fafc`, `#f1f5f9`)
- Cards: `bg-white` with `border border-slate-200`

### Typography
- Base font: 16px minimum everywhere
- Nothing below 13px in the entire app
- Labels: semibold, uppercase small text
- Calendar cells, sidebar, buttons: all larger text than current

### Cards & Containers
- Border-radius: `rounded-2xl` consistently
- `shadow-sm` on all panels
- Consistent `bg-white` + `border border-slate-200`

### Toast Notifications
- Replace ALL `alert()` calls with toast system
- Fixed position: bottom-right
- Auto-dismiss after 3 seconds
- Colors: green (success), amber (warning), red (error)
- Subtle slide-in animation

## 2. Calendar Overhaul

### Layout
- One activity section per card block (not all activities side-by-side per day like current)
- Each activity gets a colored header tab with activity name
- Within each activity card: 5 day columns (Mon-Fri) laid out horizontally, with shift rows (Mattina/Pomeriggio) stacked vertically per day
- Weeks are stacked vertically, separated by subtle dividers
- Structure: Month → Week rows → Activity cards → Day columns × Shift rows

### Day Cells
- Minimum 80px wide
- Assigned: colored badge with staff surname (staff's color as background, white text)
- Empty: dashed outline + shift icon + "Assegna" label
- Hover: subtle blue highlight on empty cells

### Today Indicator
- Bold blue left-border on today's column
- Light blue background wash

### Weekends
- Grayed out columns, still visible for context
- Not assignable (CA is weekday-focused)

### Assignment Dropdown
- Width: 320px minimum
- Each staff entry shows: name + role tag + hours progress bar
- Grouped by role if multiple roles exist
- Staff with preference for current activity appear first with star icon
- Clear "Rimuovi assegnazione" button at bottom (red)

### Navigation
- Larger prev/next buttons
- Month name centered, prominent
- Keyboard support: left/right arrows to navigate months

## 3. Settings Panel — Inline Editing

### Modal Redesign
- Full-screen overlay on mobile
- `max-w-3xl` centered card on desktop
- No max-height cap — natural scroll
- Tabs: icons + labels, bottom border highlight

### No More prompt() Dialogs
Every CRUD action uses inline forms:

#### Add/Edit Role
- Click "+" → inline row: text input + color swatch picker + Salva/Annulla
- Click pencil → row transforms to editable form in-place

#### Add/Edit Shift
- Inline row: name input + two time pickers (type="time")
- Auto-calculated hours preview shown live

#### Add/Edit Activity
- Name input
- Role requirement builder: dropdown to pick role + number spinner for count
- "Aggiungi ruolo" button to add more role requirements
- No more raw `role-1:2` format

#### Add/Edit Staff
- Name input + role dropdown + hours number input (default 38)
- Color swatch picker
- **Sede preferita** dropdown: lists all activities + "Nessuna preferenza" option

### Delete Confirmation
- Inline "Sei sicuro?" toggle (not browser `confirm()`)
- Red highlight, replaces the delete button temporarily
- Auto-cancels after 3 seconds if not confirmed

### Staff Cards in Settings
- Show unavailability count as badge
- Show preferred activity as small tag
- Click calendar icon to open unavailability modal (unchanged — already works well)

## 4. PDF Export

### UI Change
- Split current "Export" button into two: "Esporta JSON" (backup data) and "Stampa PDF" (printable schedule)
- Both in the header action bar

### PDF Layout
- Landscape A4
- One page per activity (or all on one page if 1-2 activities)
- Title: "Turni [Mese Anno] — [Activity Name]"
- Table format: rows = weekdays of month, columns = shifts
- Cells: staff surname, color-coded background
- Footer: "Generato il [date] — Gestore Turni"

### Implementation
- Hidden print-optimized div (no dark mode, no shadows, high contrast)
- html2canvas captures the div
- jspdf renders to PDF
- Download as `turni-[mese]-[anno].pdf`

### Print CSS
- `@media print` styles: hide header buttons, sidebar, footer
- Expand calendar full-width
- High contrast, no gradients
- `Ctrl+P` produces clean result

## 5. Demo Data

### Scenario: Continuita' Assistenziale

**Roles:**
- 1 role: Medico

**Shifts:**
- Mattina: 08:00-14:00 (6h)
- Pomeriggio: 14:00-20:00 (6h)

**Activities (Sedi):**
- Ambulatorio 1
- Ambulatorio 2
- Ambulatorio 3

Each activity requires 1 Medico per shift.

**Staff (8 medici):**
| Name | Max Weekly Hours | Preferred Activity | Color |
|------|------------------|--------------------|-------|
| Dr. Rossi | 24h | Ambulatorio 1 | Blue |
| Dr. Bianchi | 24h | Ambulatorio 1 | Green |
| Dr. Conti | 24h | Ambulatorio 1 | Purple |
| Dr. Ferrari | 24h | Ambulatorio 2 | Rose |
| Dr. Moretti | 24h | Ambulatorio 2 | Amber |
| Dr. Romano | 24h | Ambulatorio 2 | Teal |
| Dr. Colombo | 24h | Ambulatorio 3 | Orange |
| Dr. Ricci | 24h | Ambulatorio 3 | Cyan |

**Pre-filled assignments:** Current month (April 2026), ~70% filled respecting preferences. A few intentional gaps to demo manual assignment and auto-assign.

**Unavailability:**
- Dr. Bianchi: Ferie 14-18 April 2026
- Dr. Ferrari: Malattia 7-9 April 2026

### First-Run Behavior
- On first load (no localStorage data): load demo data directly, skip wizard
- Show dismissible top banner: "Stai vedendo dati di esempio. Clicca Impostazioni → Ricomincia per configurare i tuoi turni."
- Wizard remains accessible via Settings → "Ricomincia la Configurazione Guidata"

## 6. Staff Activity Preferences

### Data Model
New field on staff objects:
```javascript
staff: {
  id, name, roleId, maxWeeklyHours, color,
  preferredActivityId: 'activity-id' | null,  // NEW
  unavailability: [...]
}
```

### UI
- **Settings → Staff:** "Sede preferita" dropdown when adding/editing staff
- **Sidebar:** Small tag under role label showing preferred activity name
- **Assignment dropdown:** Staff with preference for current activity appear first, marked with ⭐

### Auto-Assign Priority Order
1. Staff who prefer this activity + have fewest weekly hours assigned
2. Staff with no preference + fewest weekly hours
3. Staff who prefer a different activity (only if categories 1 and 2 are exhausted/unavailable)

At each priority level, sort by fewest weekly hours (load balancing).

### Manual Assignment
No restriction — all eligible staff appear in dropdown regardless of preference. Preferred staff are visually promoted (appear first with ⭐), others appear below.

## 7. Backward Compatibility

### localStorage
- Keys unchanged: `ruap-config-v2`, `ruap-staff-v2`, `ruap-assignments-v2`
- Staff objects gain `preferredActivityId` field (defaults to `null` if missing — safe migration)

### Import/Export JSON
- Version stays 2 (minor extension, not breaking)
- Import handles staff without `preferredActivityId` gracefully (sets to `null`)
- Export includes `preferredActivityId`

### Wizard
- Code stays in codebase, accessible from Settings
- No longer default first-run experience (demo data loads instead)

## Files Changed

- `gestoreturni.html` — HTML structure, inline styles, new toast container, print-optimized hidden div
- `app.js` — All logic changes (toast system, inline forms, PDF generation, demo data, preferences, calendar overhaul)

No new files. No build tools. No framework changes.
