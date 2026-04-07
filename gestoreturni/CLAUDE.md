# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gestore Turni — shift management tool for Continuita' Assistenziale / Guardia Medica. Single-page app, fully Italian UI, no backend. Two files: `gestoreturni.html` (UI + Tailwind config) and `app.js` (all logic). Data persisted in browser localStorage.

## Quick Start

No build step. Open `gestoreturni.html` directly in browser or serve locally:

```bash
cd gestoreturni && npx serve .
# then visit http://localhost:3000/gestoreturni.html
```

Or use Python: `python -m http.server 8000` → `http://localhost:8000/gestoreturni.html`

First run loads demo data. Clear localStorage to reset.

## Development

No test suite — manual browser testing only.

## Tech Stack

- Tailwind CSS v3 (CDN — `cdn.tailwindcss.com`)
- FontAwesome 6.5 (CDN)
- jspdf 2.5.1 + html2canvas 1.4.1 (CDN, for PDF export)
- Vanilla JavaScript ES6+
- localStorage for persistence

**This is NOT the parent site's design system.** Does not use `styles.css`, `app.js` (parent), or the service worker. Completely standalone.

## Architecture

### State Shape
```javascript
state = {
  config: {
    roles: [{ id, name, color }],
    shifts: [{ id, label, startTime, endTime, hours, icon }],
    activities: [{ id, name, location, requirements: [{ roleId, count }] }]
  },
  staff: [{
    id, name, roleId, maxWeeklyHours, color,
    preferredActivityId,  // nullable — staff's preferred activity
    unavailability: [{ id, type, from, to, note }]
  }],
  assignments: {
    'YYYY-MM-DD_shiftId_activityId_slotIndex': staffId
  }
}
```

### localStorage Keys
**Note:** Both `gestoreturni` and `RUAP` use "ruap-" prefix for compatibility (shared codebase origin):
- `ruap-config-v2` — roles, shifts, activities
- `ruap-staff-v2` — staff members with unavailability
- `ruap-assignments-v2` — shift assignments (date_shift_activity_slot → staffId)
- `dark-mode` — boolean

### Rendering Pipeline
`renderAll()` calls `renderCalendar()` + `renderSidebar()`. Every mutation follows the pattern: update state → `saveToStorage()` → `renderAll()` (or targeted render). No virtual DOM — full re-render on each change.

### Assignment Key Format
`YYYY-MM-DD_shiftId_activityId_slotIndex` — this composite key is central to the app. Calendar cells, auto-assign, hour calculations, and import/export all depend on this format.

### First-Run Behavior
If no localStorage data exists, loads demo data with a dismissible banner. The onboarding wizard is accessible via Settings → "Ricomincia la Configurazione Guidata".

## Key Patterns

**CRUD operations** use inline forms (no `prompt()` dialogs). Settings modal has tabs: Ruoli, Turni, Attivita', Personale.

**Auto-assign algorithm** respects: staff activity preferences (priority 1: preferred, 2: no preference, 3: other preference), weekly hour limits, role matching, unavailability, and no double-booking within the same shift.

**Hour tracking** calculates weekly hours from `sidebarWeekStart` (Monday) and monthly hours from `calYear`/`calMonth`. Both iterate all assignments for the period.

**v1 → v2 migration** exists in `migrateV1ToV2()` for importing legacy data (hardcoded 2-location, doctors-only format).

For the specialized RUAP demo (4 doctors, config-driven), see `RUAP/CLAUDE.md`.

## Toast System (Task 4)

All `alert()` and `confirm()` dialogs replaced with toast notifications:
- 4 types: success (green), warning (amber), error (red), info (blue)
- Auto-dismiss after 3 seconds or click to close
- Location: bottom-right fixed position
- No browser dialogs — fully in-app UI

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Data not saving** | Check browser localStorage quota (DevTools → Application → Storage). Clear old data or export/reimport in smaller batches |
| **Demo banner won't dismiss** | Click the X button or refresh page. If localStorage is full, banner persists. Clear storage via Settings or DevTools |
| **Auto-assign not working** | Check that at least one staff member has no preference or matching role. If all are unavailable, assignment skips silently |
| **Hours not calculating** | Verify `maxWeeklyHours` is set for all staff. Empty shifts don't count toward hours; assignments must have a `staffId` |
| **Calendar jumps to wrong month** | Browser timezone mismatch. Assignment keys use `YYYY-MM-DD` (local date). Check system date/timezone |
| **Import fails with no error** | JSON schema must match v2 structure (staff with `maxWeeklyHours`, assignments as date_shift_activity_slot). Try exporting then re-importing to verify format |

## Design Specs

Active design docs in `docs/superpowers/specs/`:
- `2026-04-07-gestoreturni-demo-polish-design.md` — current approved spec for UX overhaul
