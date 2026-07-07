# AGENTS.md — RUAP Attività Diurne

## Entry point
- `RUAP/index.html` loads `<script type="module" src="js/events.js">`
- Modules under `RUAP/js/`: `config.js`, `core-utils.js`, `engine.js`, `events.js`, `holidays.js`, `renderers.js`, `state.js`
- Module DAG: `config → holidays → core-utils → state → renderers ← engine ← events` — no cycles

## Config
- `RUAP/config.js` — doctors, 2 places (`M.S.Savino`, `Subbiano`), 2 slots (`mat`/`pom`, 6h each), initial assignments
- `CONFIG.doctors` has `preferredPlace: string | null` — null means flexible, can work anywhere
- No doctors have `isPool: true` currently — pool logic exists but unused

### Monthly config update from JSON export
When the user provides a RUAP JSON export (e.g. `agosto.json`) to set as defaults:
1. **Doctors** — merge `unavailPeriods` per doctor ID, add any new doctors (including new IDs like `Olivieri`), update `monthlyBudget` if changed
2. **Assignments** — replace the entire `assignments` object with the export's assignments
3. Keep `places`, `slots`, and doctor definitions (name, preferredPlace, availability, weeklyHours, etc.) unchanged unless the export clearly overrides them

## engine.js — allocation algorithm
- `pickDoctorForSlot()` has 2 priority tiers: (1) doctors who prefer this place OR have no `preferredPlace` (flexible), (2) doctors who prefer another place
- Within each tier, doctors are sorted by **fewest assigned hours first** (`assignedInTarget[doc.id]`) — distributes work equitably regardless of budget size
- **Doctors with `preferredPlace: null` are flexible** — they share priority with doctors who prefer that sede
- If `isDoctorAvailableForSlot()` returns false (unavailability period, wrong shift slot, holiday, weekend) or `getEffectiveRemaining(doc) ≤ 0`, the doctor is skipped
- Pool doctors (`isPool: true`) are only used when no primary doctor is available

## DOM gotchas
- Calendar grid ID: **`cal-grid`** (not `calendar-grid`).
- Calendar title: **`cal-title`**.
- Navigation buttons: `cal-prev` / `cal-next` need JS-attached listeners (not inline `onclick`).
- Sidebar week scroll: `sidebar-week-prev` / `sidebar-week-next` also need JS-attached listeners.
- `renderAll()` must call `updateGeneraButtonLabel()` or the "Genera mese" button shows a stale month name.
- Month view only renders **Mon–Fri** (5 cells per week). Holidays show "Chiuso". Never render Sat/Sun cells.

## Bug-hunting checklist
1. **DOM ID mismatch** — `cal-grid` (not `calendar-grid`), `cal-title`, `cal-prev`/`cal-next`.
2. **`inMonth` guard** — `createSlotButton()` only attaches click handlers when `inMonth === true`.
3. **`stopPropagation` chain** — `closeAssignDropdown` document listener fires on any click; slot handlers must call `e.stopPropagation()` first.
4. **Module import/export integrity** — Every function used in `renderers.js` and referenced in `events.js` must be exported/imported. Inline `onclick` handlers need `window.*` exposure.
5. **`hidden` class ordering** — Tailwind's `hidden` sets `display: none`. Always `remove('hidden')` AFTER positioning.
6. **Re-render wipes direct listeners** — `container.innerHTML = ''` destroys child listeners. Prefer delegation over direct `addEventListener`.
7. **Live binding `SLOTS` / `PLACES`** — ES module live bindings from `state.js` — propagate automatically after `reloadPlaces()`/`reloadSlots()`.
8. **`e.currentTarget` in delegated handlers** — When using `closest('[data-slot-key]')`, read from the found ancestor, not `e.currentTarget`.
9. **HTML→JS button wiring** — Every `<button id>` must have an `el('id')` listener in `events.js` or `onclick` referencing a `window.*` function.
10. **`pointer-events-none` on toast** — `#toast-container` has `pointer-events-none`. Confirmation toasts need `pointer-events-auto`.
11. **Allocation skips doctors with no preferredPlace** — If a doctor has `preferredPlace: null` and gets no shifts, check `pickDoctorForSlot()` priority grouping.

## CDN dependencies
- jsPDF, html2canvas, XLSX (SheetJS) loaded from CDN in `RUAP/index.html`. Not vendored. If CDN fails, features show a toast error.

## Other instruction files
- **`CLAUDE.md`** in this directory — RUAP data schema, budget system, import/export format, generate algorithm
