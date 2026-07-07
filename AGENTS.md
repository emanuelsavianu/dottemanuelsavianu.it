# AGENTS.md — Portale Medico Dr. Savianu

## Quick orientation
- **Static HTML/CSS/JS** on GitHub Pages (`dottemanuelsavianu.it`). Push `main` → auto-deploy. No build step, no test suite.
- **Separate patient portal** at `savianu.it` is a different repo (`emanuelsavianu.github.io`). Don't mix changes.
- Serve locally: `npx serve .`
- **Two `config.js` files exist** with different purposes:
  - Root `/config.js` — `CONFIG.ASSENZE`, `CONFIG.SCHEDULE`, `CONFIG.getActiveAbsence()` for absences/banner/hours
  - `RUAP/config.js` — `CONFIG.doctors`, `CONFIG.places`, `CONFIG.slots`, `CONFIG.assignments` for shift data

## Must-know gotchas

### Service worker bump (MANDATORY on every edit)
- Bump `CACHE_NAME` in `sw.js` (e.g. `'savianu-v178'`). List edited files in the CACHE_NAME comment.
- Add new `.html` files to `urlsToCache` array.
- Returning visitors see stale content without a bump. GH Pages deploy lag: 45-60s.
- **`offline.html` exists but is NOT in `urlsToCache`** — the SW falls back to `/` (index.html) when offline, not `offline.html`. To enable the custom offline page, add it to `urlsToCache` and update the `networkFirst` catch handler.

### `config.js` NOT loaded on every page
- Root `index.html` does **not** include `config.js`. Pages that do: `colleghi.html`, `faq.html`, `impegnative.html`, `cert-malattia.html`, `esenzioni.html`, `RUAP/index.html`.
- Before any `CONFIG.*` access in `app.js`, guard with: `if (typeof CONFIG === 'undefined') return;`.
- New pages needing schedule/absence data must explicitly add the `<script src="config.js">` tag.

### `.container` breaks single-column standalone pages
- At ≥900px, `.container` applies `grid-template-columns: 2fr 1fr`. Standalone/guide pages must NOT use `class="container"`. Use `display: block` + inline `max-width` instead.

### Dark mode CSS variable inversion
In `html.dark`:
- `--white` → `#162438` (navy — backgrounds, NOT text)
- `--primary-dark` → `#e0b976` (gold — headings, NOT backgrounds)
- `--text-dark` → `#f3efe6` (cream — correct text color)
For manual overrides: use **raw hex** (`#f3efe6`, `#0d1e33`) — CSS variables in dark mode produce dark-on-dark.

### `calcolatore-ferie.html` is a completely separate stack
- **React + Tailwind CDN.** Does NOT use `styles.css` or main `app.js`. Separate design system (teal brand-600).
- Separate localStorage prefix: `calcolatore-ferie-mdg-*`. Don't apply main site patterns to it.

### Large files
- `visite-private.html` (~1250 lines) — read with `offset`/`limit`
- `RUAP/app.js` (~2180 lines, refactored) — has section banners (`// === 7. RENDERING ===`) for navigation. Prefer Grep over Read for targeted edits.

### RUAP-specific DOM gotchas
- Calendar grid ID is **`cal-grid`**, NOT `calendar-grid`.
- Calendar title is **`cal-title`** (set in `renderCalendarWeek`/`renderCalendarMonth`).
- Month/week navigation buttons `cal-prev` / `cal-next` need JS-attached listeners that handle both monthly and weekly views (not inline `onclick` in HTML).
- Sidebar week scroll buttons `sidebar-week-prev` / `sidebar-week-next` also need JS-attached listeners.
- `renderAll()` must call `updateGeneraButtonLabel()` or the "Genera mese" button shows a stale month name.
- Month view only iterates **Mon–Fri** (5 cells per week). Holidays show "Chiuso". Never render Sat/Sun cells.

### CDN dependencies
- jsPDF, html2canvas, XLSX (SheetJS) loaded from CDN in `RUAP/index.html` and `gestoreturni/gestoreturni.html`. Not vendored. If CDN fails, features show a toast error.

## Conventions

### Italian medical advertising rules
- **Forbidden**: superlatives ("il migliore"), testimonials, years-of-experience claims, comparative advertising
- **Required on service pages**: "Il medico di famiglia SSN può rilasciare il medesimo servizio gratuitamente ai propri assistiti"
- **Always factual**: "Il Dott. X è certificatore telematico INPS autorizzato" — never promotional

### SEO
- Title ≤60 chars, meta description ≤155 chars (Google truncates beyond)
- `og:image`: `bluelogo.png` (physician/general pages) or `bronzelogo.png` (certificates/services)
- Pages with `<meta name="robots" content="noindex">` must NOT be in `sitemap.xml` (currently violated: `faq.html`, `impegnative.html`, `esenzioni.html`, `cert-malattia.html`, `calcolatore-ferie.html`, `calcolatoreferiegemini.html`, `ferie.html`, `installazione.html`, `protocollo-certificati-inps.html`, `rsa.html`, `xsegretarie.html` are `noindex` but in sitemap)
- Public indexed pages: `index.html`, `visite-private.html`, `faq-riforma.html`, `certificato-invalidita-civile.html`, `malattia.html`, `privacy.html`
- Update `llms.txt` when adding/removing public-facing pages

### Git
- **Always commit AND push together** (never commit-only)
- Repo enforces LF line endings via `.gitattributes` — Windows commits auto-convert
- `.gitignore` has `*.md` → `!README.md` `!AGENTS.md` `!CLAUDE.md`, but CLAUDE.md files are **already tracked** (committed before gitignore entry). They show in `git status` regardless.

### Print styles
Every new page needs: hide `.topbar, footer, nav`, reset `.page-hero` background, expand `.faq-answer` max-height. See `styles.css` `@media print` for patterns. RUAP sub-app has its own print styles in `index.html`.

## Sub-apps

| App | Dir | Stack | Notes |
|-----|-----|-------|-------|
| Main site | `/` | styles.css + app.js | PWA (sw.js + manifest.json + offline.html), config.js NOT on root index |
| Gestore Turni | `gestoreturni/` | Tailwind CDN, standalone | CRUD shift manager; localStorage keys `ruap-*`; read `CLAUDE.md` for migration patterns |
| RUAP Attività Diurne | `RUAP/` | Tailwind CDN, config-driven | 16 doctors, monthly budget, Excel import/export, Genera Mese; app.js has section banners (`// === 7. RENDERING ===`) for navigation; read `CLAUDE.md` for budget schema |

## RUAP bug-hunting checklist
When debugging RUAP UI issues (click handlers, dropdowns, missing slots), check these in order:

1. **DOM ID mismatch** — `cal-grid` (not `calendar-grid`), `cal-title`, `cal-prev`/`cal-next`. The old monolithic `app.js` used different IDs; the refactored modules use `el()` which wraps `getElementById`.
2. **`inMonth` guard** — `createSlotButton()` only attaches click handlers when `inMonth === true`. In month view, cells outside the current month get `inMonth = false` and no handler.
3. **`stopPropagation` chain** — If a click doesn't reach its handler, check whether an ancestor listener calls `stopPropagation()` first. The `closeAssignDropdown` document listener fires on any click; slot handlers must call `e.stopPropagation()` before the event bubbles.
4. **Module import/export integrity** — Every function used in `renderers.js` and referenced in `events.js` must be exported from its module and imported in `events.js`. Inline `onclick` handlers (sidebar doctor cards) need `window.*` exposure.
5. **`hidden` class ordering** — Tailwind's `hidden` sets `display: none`. Always `remove('hidden')` AFTER positioning, never before. `closeAssignDropdown()` adds `hidden`; `openAssignDropdown()` removes it last.
6. **Re-render wipes direct listeners** — `container.innerHTML = ''` destroys child elements and their listeners. Delegated listeners (on a stable ancestor like `cal-grid`) survive re-renders. Prefer delegation over direct `addEventListener` on recreated children.
7. **Live binding `SLOTS` / `PLACES`** — These are ES module live bindings exported from `state.js`. After `reloadPlaces()`/`reloadSlots()`, the new values propagate to all importing modules automatically.
8. **`e.currentTarget` in delegated handlers** — When using `closest('[data-slot-key]')`, read `btn.dataset.*` from the found ancestor, not from `e.currentTarget`.

## Other instruction files
- **`CLAUDE.md`** — Full architecture, dark mode, responsive patterns, schema markup, DNS/hosting (258 lines, tracked in git)
- **`RUAP/CLAUDE.md`** — RUAP data schema, budget system, import/export format, generate algorithm (tracked in git)
- **`gestoreturni/CLAUDE.md`** — Gestore Turni state shape, localStorage keys, migration patterns (tracked in git)
