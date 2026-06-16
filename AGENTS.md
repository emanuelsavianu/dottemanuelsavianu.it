# AGENTS.md — Portale Medico Dr. Savianu

## Quick orientation
- **Static HTML/CSS/JS** site on GitHub Pages (`dottemanuelsavianu.it`). Push `main` → auto-deploy. No build step, no test suite.
- **Separate patient portal** at `savianu.it` is a different repo (`emanuelsavianu.github.io`). Don't mix changes.
- Serve locally: `npx serve .`

## Must-know gotchas

### Service worker bump (MANDATORY on every HTML/CSS/JS edit)
- Bump `CACHE_NAME` in `sw.js` (e.g. `'savianu-v171'`) and list edited/new `.html` files in the CACHE_NAME comment
- Add any new `.html` file to the `urlsToCache` array in `sw.js`
- Forgetting this means returning visitors see stale cached content. GitHub Pages deploy lag: 45-60s.

### `config.js` is NOT loaded on every page
- Root `index.html` does **not** include `config.js`. Pages that do: `colleghi.html`, `faq.html`, `impegnative.html`, `cert-malattia.html`, `esenzioni.html`, `RUAP/index.html`
- Before any `CONFIG.*` access in `app.js`, guard with: `if (typeof CONFIG === 'undefined') return;`
- New pages needing schedule/absence data must explicitly add the script tag

### `.container` breaks single-column standalone pages
- At ≥900px, `.container` applies `grid-template-columns: 2fr 1fr`
- Standalone/guide pages must NOT use `class="container"`. Use `display: block` + inline `max-width` instead.

### `calcolatore-ferie.html` is a completely separate stack
- **React + Tailwind CDN.** Does NOT use `styles.css` or main `app.js`. Separate design system (teal brand-600).
- Separate localStorage prefix: `calcolatore-ferie-mdg-*`. Don't apply main site patterns to it.

### `gestoreturni/` and `RUAP/` are standalone apps
- Each has its own HTML + Tailwind CDN + vanilla JS. Do NOT reference main `styles.css` or main `app.js`.
- Each persists to its own localStorage keys. See `gestoreturni/CLAUDE.md` and `RUAP/CLAUDE.md`.

### Dark mode CSS variable inversion
In `body.dark-mode`, these variables invert radically:
- `--white` → `#162438` (navy — backgrounds, NOT text)
- `--primary-dark` → `#e0b976` (gold — headings, NOT backgrounds)
- `--text-dark` → `#f3efe6` (cream — correct text color)

For manual overrides: use raw hex (`#f3efe6`, `#0d1e33`) — CSS variables in dark mode produce dark-on-dark.

### Large file: `visite-private.html` (~17k tokens)
Always read with `offset`/`limit` to avoid context overflow.

### `RUAP/app.js` (~2400 lines, multimodal)
Larger than typical; use offset/limit, and prefer Grep over Read for targeted edits. When editing, read key sections (COLOR_PALETTE, config-seeding, monthlyBudget helpers, importFromRows, generateNextMonth) to understand context before changes.

## Conventions

### Italian medical advertising rules
- **Forbidden**: superlatives ("il migliore"), testimonials, years-of-experience claims, comparative advertising
- **Required on service pages**: "Il medico di famiglia SSN può rilasciare il medesimo servizio gratuitamente ai propri assistiti"
- **Always factual**: "Il Dott. X è certificatore telematico INPS autorizzato" — never promotional

### Print styles needed for every new page
```css
@media print {
  .topbar, footer, nav { display: none; }
  .page-hero { background: none !important; color: #000; }
  .faq-answer { max-height: none !important; }
}
```

### SEO
- Title ≤60 chars, meta description ≤155 chars (Google truncates beyond)
- `og:image`: `bluelogo.png` (physician/general pages) or `bronzelogo.png` (certificates/services)
- Pages with `<meta name="robots" content="noindex">` must NOT be in `sitemap.xml`

### Git
- **Always commit AND push together** (never commit-only)
- Repo enforces LF line endings via `.gitattributes` — Windows commits auto-convert
- All `*.md` files are gitignored except `README.md`, `AGENTS.md`

## Sub-apps at a glance

| App | Dir | Stack | Local server | Notes |
|-----|-----|-------|-------------|-------|
| Main site | `/` | styles.css + app.js | `npx serve .` | Service-worker'd, config.js NOT on root index (see gotcha above) |
| Gestore Turni | `gestoreturni/` | Tailwind CDN, standalone | `cd gestoreturni && npx serve .` | Full CRUD; localStorage keys `ruap-*` |
| RUAP Attività Diurne | `RUAP/` | Tailwind CDN, config-driven | `cd RUAP && npx serve .` | 16 doctors, monthly budget, Excel import/export, Genera Mese |

**RUAP key facts (2026-06 update):**
- `config.js` pre-configures 10 primary + 6 pool doctors, each with `monthlyBudget` (default: `weeklyHours × 4`) and `isPool` flag
- Pool doctors (24h/month fixed) are 2nd-priority in "Genera Mese" after primary doctors
- First run auto-loads from `config.js` (no wizard). Setup button restarts wizard.
- New buttons: *Import XLSX* (parses assignments + remaining-hour table), *Export XLSX*, *Genera [Mese]* (fills next month via budget-aware algorithm)
- Sidebar: collapsible **Bilancio Mensile** panel showing `used/budget` per doctor
- See `RUAP/CLAUDE.md` for full schema and patterns
